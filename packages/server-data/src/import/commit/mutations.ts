import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { tag } from "@cobalt-web/db/schema/accounts/banking/tags/tag";
import { transactionTag } from "@cobalt-web/db/schema/accounts/banking/tags/transaction-tag";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import type {
  AccountResolution,
  CategoryResolution,
  PendingAccountCreate,
} from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { TAG_COLORS } from "@cobalt-web/db/tag-palette";
import { env } from "@cobalt-web/env/server";
import { del } from "@vercel/blob";
import { and, eq, inArray, sql } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error";
import { cacheAccountChoices } from "../account-mapping/cache";
import { hashImportRow } from "../shared/dedupe-hash";

/**
 * Materialise any `PendingAccountCreate` entries in an `AccountResolution` —
 * inserts the `financial_account` row + zero balance, then patches the
 * resolution map so downstream insert can reference the real accountId.
 *
 * Existing-account entries are validated: if a referenced accountId was
 * deleted between Step 3 confirm and commit, throws so the workflow fails
 * cleanly rather than producing FK-violation noise in chunked insert.
 */
/** Persist the resolved (no-pendingCreates) account resolution post-create. */
export async function persistResolvedAccountResolution(
  jobId: string,
  resolution: AccountResolution,
): Promise<void> {
  await db.update(importJob).set({ accountResolution: resolution }).where(eq(importJob.id, jobId));
}

/** Persist the resolved category resolution map post-create (clears pendingCreates). */
export async function persistResolvedCategoryResolution(
  jobId: string,
  resolution: CategoryResolution,
  resolvedMap: Record<string, string>,
): Promise<void> {
  await db
    .update(importJob)
    .set({
      categoryResolution: {
        ...resolution,
        map: resolvedMap,
        pendingCreates: [],
      },
    })
    .where(eq(importJob.id, jobId));
}

export async function applyPendingAccountCreates(
  userId: string,
  resolution: AccountResolution,
): Promise<AccountResolution> {
  const ownedAccounts = await db.query.financialAccount.findMany({
    columns: { id: true },
    where: { userId: { eq: userId } },
  });
  const ownedIds = new Set(ownedAccounts.map((a) => a.id));

  if (resolution.kind === "single") {
    if ("accountId" in resolution) {
      if (!ownedIds.has(resolution.accountId)) {
        throw new ApiError(
          409,
          "account_resolution_stale",
          "Cannot commit — target account no longer exists. Re-confirm Step 3.",
        );
      }
      return resolution;
    }
    const [created] = await bulkInsertPendingAccounts(userId, [
      { create: resolution.pendingCreate, label: "__single__" },
    ]);
    if (!created) {
      throw new ApiError(
        500,
        "account_create_failed",
        `Failed to create account "${resolution.pendingCreate.name}"`,
      );
    }
    return { accountId: created.accountId, kind: "single" };
  }

  // perLabel — validate existing entries, collect pending creates, bulk-insert.
  const next: Record<string, string | "skip"> = {};
  const pending: { label: string; create: PendingAccountCreate }[] = [];
  for (const [label, entry] of Object.entries(resolution.map)) {
    if (entry === "skip") {
      next[label] = "skip";
      continue;
    }
    if (typeof entry === "string") {
      if (!ownedIds.has(entry)) {
        throw new ApiError(
          409,
          "account_resolution_stale",
          `Cannot commit — target account for "${label}" no longer exists. Re-confirm Step 3.`,
        );
      }
      next[label] = entry;
      continue;
    }
    pending.push({ create: entry, label });
  }

  if (pending.length > 0) {
    const created = await bulkInsertPendingAccounts(userId, pending);
    for (const { accountId, label } of created) {
      next[label] = accountId;
    }
    // Write-through cache so future imports of these source labels skip the AI agent.
    // Deferred until now because account ids only exist after this insert.
    await cacheAccountChoices(
      userId,
      created.map(({ accountId, label }) => ({
        cobaltAccountId: accountId,
        sourceLabel: label,
      })),
    );
  }
  return { kind: "perLabel", map: next };
}

/**
 * Bulk-insert pending account creates in one transaction. Postgres RETURNING
 * preserves VALUES order, so the i-th returned row corresponds to the i-th input.
 */
async function bulkInsertPendingAccounts(
  userId: string,
  pending: { label: string; create: PendingAccountCreate }[],
): Promise<{ label: string; accountId: string }[]> {
  if (pending.length === 0) {
    return [];
  }
  return await db.transaction(async (tx) => {
    const accounts = await tx
      .insert(financialAccount)
      .values(
        pending.map(({ create }) => ({
          institutionName: create.institutionName ?? null,
          logoDomain: create.institutionLogoDomain ?? null,
          name: create.name,
          source: "manual" as const,
          subtype: create.subtype,
          type: create.type,
          userId,
        })),
      )
      .returning({ id: financialAccount.id });
    if (accounts.length !== pending.length) {
      throw new ApiError(500, "account_create_failed", "Failed to create one or more accounts");
    }
    await tx.insert(balance).values(
      accounts.map((a) => ({
        accountId: a.id,
        currency: "USD",
        current: "0",
        userId,
      })),
    );
    return pending.map((p, i) => {
      const account = accounts[i];
      if (!account) {
        throw new ApiError(500, "account_create_failed", `Missing returned account at index ${i}`);
      }
      return { accountId: account.id, label: p.label };
    });
  });
}

export async function applyPendingCreates(
  userId: string,
  creates: CategoryResolution["pendingCreates"],
  resolutionMap: Record<string, string>,
  uncategorizedId: string,
): Promise<Record<string, string>> {
  // Resolve user's owned groups + categories once for both staleness checks below.
  const groups = await db.query.categoryGroup.findMany({
    columns: { id: true },
    where: { userId: { eq: userId } },
  });
  const userGroupIds = new Set(groups.map((g) => g.id));
  const fallbackGroupId = groups[0]?.id;

  const ownedCategories = await db.query.category.findMany({
    columns: { id: true },
    where: { userId: { eq: userId } },
  });
  const ownedCategoryIds = new Set(ownedCategories.map((cat) => cat.id));

  // Staleness pass: any link target deleted between confirm + commit falls back
  // to the user's "uncategorized" so the import doesn't FK-violate.
  const updated: Record<string, string> = {};
  for (const [label, categoryId] of Object.entries(resolutionMap)) {
    if (categoryId.startsWith("__pending:")) {
      updated[label] = categoryId; // resolved below
      continue;
    }
    updated[label] = ownedCategoryIds.has(categoryId) ? categoryId : uncategorizedId;
  }

  if (creates.length === 0) {
    return updated;
  }
  if (userGroupIds.size === 0 || !fallbackGroupId) {
    throw new ApiError(
      409,
      "category_groups_missing",
      "Cannot create categories — no category groups exist for user",
    );
  }
  // Bulk insert; Postgres RETURNING preserves VALUES order so the i-th row
  // corresponds to creates[i]. Fall back to first group if the originally-chosen
  // group was deleted.
  const created = await db
    .insert(category)
    .values(
      creates.map((c) => ({
        groupId: userGroupIds.has(c.groupId) ? c.groupId : fallbackGroupId,
        iconKey: c.iconKey,
        name: c.name,
        userId,
      })),
    )
    .returning({ id: category.id });
  if (created.length !== creates.length) {
    throw new ApiError(500, "category_create_failed", "Failed to create one or more categories");
  }
  for (const [i, c] of creates.entries()) {
    const row = created[i];
    if (!row) {
      throw new ApiError(500, "category_create_failed", `Missing returned category at index ${i}`);
    }
    updated[c.sourceLabel] = row.id;
  }
  return updated;
}

/**
 * Chunked insert of staged rows into `transaction`, dedup'd by
 * `(userId, importHash)` UNIQUE — re-imports of the same export silently skip.
 * Cancellation: caller passes `isCancelled()`; we exit the loop early keeping
 * already-inserted chunks (matches Notion/Stripe import UX).
 */
export async function insertCommitChunks({
  accountResolution,
  categoryMap,
  jobId,
  isCancelled,
  onProgress,
  uncategorizedId,
  userId,
}: {
  jobId: string;
  userId: string;
  accountResolution: AccountResolution;
  categoryMap: Record<string, string>;
  uncategorizedId: string;
  onProgress: (done: number, total: number) => Promise<void>;
  isCancelled: () => Promise<boolean>;
}): Promise<{ imported: number; duplicates: number; excluded: number }> {
  const CHUNK = 5000;
  const staged = await db.query.importStagedTransaction.findMany({
    where: { importJobId: { eq: jobId }, parseError: { isNull: true } },
  });
  // Reverse-direction filter: if the target account already has Plaid-sourced
  // transactions, only let CSV rows dated *before* Plaid's earliest fill in
  // the pre-Plaid gap. Anything on/after Plaid's coverage start would dupe.
  const plaidCoverageFrom = await loadPlaidCoverageStarts(userId, accountResolution);
  const total = staged.length;
  let imported = 0;
  let duplicates = 0;
  let excluded = 0;

  for (let offset = 0; offset < staged.length; offset += CHUNK) {
    if (await isCancelled()) {
      break;
    }
    const slice = staged.slice(offset, offset + CHUNK);
    const inserts: NonNullable<ReturnType<typeof buildInsert>>[] = [];
    const tagsByHash = new Map<string, string[]>();
    for (const row of slice) {
      const built = buildInsert(
        row,
        accountResolution,
        categoryMap,
        uncategorizedId,
        jobId,
        userId,
      );
      if (built === null) {
        excluded += 1;
      } else {
        const plaidStart = plaidCoverageFrom.get(built.accountId);
        if (plaidStart && built.date >= plaidStart) {
          excluded += 1;
          continue;
        }
        inserts.push(built);
        if (row.tags && row.tags.length > 0) {
          tagsByHash.set(built.importHash, row.tags);
        }
      }
    }

    if (inserts.length > 0) {
      const inserted = await db
        .insert(transaction)
        .values(inserts)
        .onConflictDoNothing({
          target: [transaction.userId, transaction.importHash],
          where: sql`${transaction.importHash} is not null`,
        })
        .returning({ id: transaction.id, importHash: transaction.importHash });
      imported += inserted.length;
      duplicates += inserts.length - inserted.length;
      if (tagsByHash.size > 0) {
        await wireTags(userId, inserted, tagsByHash);
      }
    }
    await onProgress(offset + slice.length, total);
  }

  return { duplicates, excluded, imported };
}

function buildInsert(
  row: {
    amount: string;
    date: string;
    merchant: string;
    notes: string | null;
    originalDescription: string | null;
    rawBlob: unknown;
    sourceAccountName: string;
    sourceCategoryName: string | null;
  },
  accountResolution: AccountResolution,
  categoryMap: Record<string, string>,
  uncategorizedId: string,
  jobId: string,
  userId: string,
): {
  accountId: string;
  amount: string;
  categoryId: string;
  date: string;
  excluded: boolean;
  importHash: string;
  importJobId: string;
  merchantName: string;
  name: string;
  notes: string | null;
  pending: false;
  source: "manual";
  userId: string;
} | null {
  const accountId = resolveAccountId(row.sourceAccountName, accountResolution);
  if (!accountId) {
    return null;
  }
  const categoryId = row.sourceCategoryName
    ? (categoryMap[row.sourceCategoryName] ?? uncategorizedId)
    : uncategorizedId;
  const amountCents = Math.round(Number.parseFloat(row.amount) * 100);
  const importHash = hashImportRow({
    accountId,
    amountCents,
    date: row.date,
    merchant: row.merchant,
  });
  return {
    accountId,
    amount: row.amount,
    categoryId,
    date: row.date,
    excluded: Boolean((row.rawBlob as { _excluded?: boolean } | null)?._excluded),
    importHash,
    importJobId: jobId,
    merchantName: row.merchant,
    name: row.originalDescription || row.merchant || "Untitled",
    notes: row.notes,
    pending: false,
    source: "manual",
    userId,
  };
}

/** Postgres `tag.name` column max length. Names outside (1..MAX_TAG_LEN] are dropped. */
const MAX_TAG_LEN = 50;

/** Normalize a raw tag name; returns null if it should be dropped (empty or too long). */
function normalizeTagName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TAG_LEN) {
    return null;
  }
  return trimmed;
}

/** Deterministic palette color for a tag name — same name → same color across users. */
function colorForTagName(name: string): string {
  // Modulo guarantees in-bounds; `?? TAG_COLORS[0]` is unreachable but satisfies `noUncheckedIndexedAccess`.
  return TAG_COLORS[hashName(name) % TAG_COLORS.length] ?? TAG_COLORS[0];
}

async function wireTags(
  userId: string,
  inserted: { id: string; importHash: string | null }[],
  tagsByHash: Map<string, string[]>,
): Promise<void> {
  const idByHash = new Map(
    inserted.flatMap((i) => (i.importHash ? [[i.importHash, i.id] as const] : [])),
  );
  const distinctNames = collectDistinctTagNames(tagsByHash, idByHash);
  if (distinctNames.size === 0) {
    return;
  }
  const tagIdByLower = await upsertTags(userId, distinctNames);
  const joins = buildTransactionTagJoins(tagsByHash, idByHash, tagIdByLower);
  if (joins.length === 0) {
    return;
  }
  await db
    .insert(transactionTag)
    .values(joins)
    .onConflictDoNothing({
      target: [transactionTag.transactionId, transactionTag.tagId],
    });
}

/** All trimmed tag names referenced by a successfully-inserted row. */
function collectDistinctTagNames(
  tagsByHash: Map<string, string[]>,
  idByHash: Map<string, string>,
): Set<string> {
  const out = new Set<string>();
  for (const [hash, names] of tagsByHash) {
    if (!idByHash.has(hash)) {
      continue;
    }
    for (const raw of names) {
      const name = normalizeTagName(raw);
      if (name) {
        out.add(name);
      }
    }
  }
  return out;
}

/**
 * Resolve every distinct tag name to a `tag.id`, inserting any missing ones.
 * Two queries max: one SELECT (existing), one INSERT (new), regardless of count.
 * Returns lookup keyed by lowercased name (Postgres tag.name uniqueness is case-insensitive).
 */
async function upsertTags(
  userId: string,
  distinctNames: Set<string>,
): Promise<Map<string, string>> {
  const lowerNames = [...distinctNames].map((n) => n.toLowerCase());
  const existing = await db
    .select({
      id: tag.id,
      lowerName: sql<string>`lower(${tag.name})`.as("lower_name"),
    })
    .from(tag)
    .where(and(eq(tag.userId, userId), inArray(sql`lower(${tag.name})`, lowerNames)));
  const tagIdByLower = new Map(existing.map((r) => [r.lowerName, r.id]));

  const missing = [...distinctNames].filter((n) => !tagIdByLower.has(n.toLowerCase()));
  if (missing.length === 0) {
    return tagIdByLower;
  }
  const created = await db
    .insert(tag)
    .values(
      missing.map((name) => ({
        color: colorForTagName(name),
        name,
        userId,
      })),
    )
    .returning({
      id: tag.id,
      lowerName: sql<string>`lower(${tag.name})`.as("lower_name"),
    });
  for (const r of created) {
    tagIdByLower.set(r.lowerName, r.id);
  }
  return tagIdByLower;
}

/** Build the (transactionId, tagId) join rows; dedupes per-transaction. */
function buildTransactionTagJoins(
  tagsByHash: Map<string, string[]>,
  idByHash: Map<string, string>,
  tagIdByLower: Map<string, string>,
): { transactionId: string; tagId: string }[] {
  const joins: { transactionId: string; tagId: string }[] = [];
  for (const [hash, names] of tagsByHash) {
    const transactionId = idByHash.get(hash);
    if (!transactionId) {
      continue;
    }
    const seen = new Set<string>();
    for (const raw of names) {
      const name = normalizeTagName(raw);
      if (!name) {
        continue;
      }
      const lower = name.toLowerCase();
      if (seen.has(lower)) {
        continue;
      }
      seen.add(lower);
      const tagId = tagIdByLower.get(lower);
      if (tagId) {
        joins.push({ tagId, transactionId });
      }
    }
  }
  return joins;
}

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h *= 31;
    h += s.codePointAt(i) ?? 0;
    h %= 2_147_483_647;
  }
  return h;
}

/**
 * For every accountId reachable through `resolution`, fetch the earliest
 * Plaid-sourced transaction date already on the account. Returned map only
 * has entries for accounts that have any Plaid history — others fall through
 * the filter as no-ops.
 */
async function loadPlaidCoverageStarts(
  userId: string,
  resolution: AccountResolution,
): Promise<Map<string, string>> {
  const accountIds = new Set<string>();
  if (resolution.kind === "single") {
    if ("accountId" in resolution) {
      accountIds.add(resolution.accountId);
    }
  } else {
    for (const entry of Object.values(resolution.map)) {
      if (typeof entry === "string" && entry !== "skip") {
        accountIds.add(entry);
      }
    }
  }
  if (accountIds.size === 0) {
    return new Map();
  }
  const rows = await db
    .select({
      accountId: transaction.accountId,
      minDate: sql<string>`min(${transaction.date})`.as("min_date"),
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.source, "plaid"),
        inArray(transaction.accountId, [...accountIds]),
      ),
    )
    .groupBy(transaction.accountId);
  return new Map(rows.filter((r) => r.minDate !== null).map((r) => [r.accountId, r.minDate]));
}

function resolveAccountId(sourceAccountName: string, resolution: AccountResolution): string | null {
  if (resolution.kind === "single") {
    if ("accountId" in resolution) {
      return resolution.accountId;
    }
    // Pending create should have been materialised by applyAccountCreatesStep.
    throw new ApiError(
      500,
      "account_resolution_unmaterialised",
      "Account resolution still has unmaterialised pending create",
    );
  }
  const v = resolution.map[sourceAccountName];
  if (!v || v === "skip") {
    return null;
  }
  if (typeof v === "string") {
    return v;
  }
  throw new ApiError(
    500,
    "account_resolution_unmaterialised",
    `Account resolution for "${sourceAccountName}" still has unmaterialised pending create`,
  );
}

/**
 * Advance each affected account's `csv_coverage_through` watermark to the
 * max(date) of transactions just imported for that account. Plaid sync uses
 * this watermark to skip txns dated `<=` it, giving gap-fill semantics on
 * CSV-then-Plaid promotion. Idempotent — replays of the same job only ever
 * move the watermark forward (`greatest()` floors at the existing value).
 */
export async function setCsvCoverageForAccounts(jobId: string): Promise<void> {
  await db.execute(sql`
    UPDATE ${financialAccount}
       SET csv_coverage_through = GREATEST(
         ${financialAccount.csvCoverageThrough},
         sub.max_date
       )
      FROM (
        SELECT account_id, max(date) AS max_date
          FROM ${transaction}
         WHERE import_job_id = ${jobId}
         GROUP BY account_id
      ) sub
     WHERE ${financialAccount.id} = sub.account_id
  `);
}

export async function finalizeCommit(
  jobId: string,
  summary: {
    imported: number;
    failed: number;
    duplicates: number;
    excluded: number;
    rejected: { row: number; reason: string }[];
  },
): Promise<void> {
  await setCsvCoverageForAccounts(jobId);
  const job = await db.query.importJob.findFirst({
    columns: { fileKey: true },
    where: { id: { eq: jobId } },
  });
  if (job?.fileKey) {
    // Best-effort: blob deletion failure shouldn't fail commit (cron sweep covers it).
    try {
      await del(job.fileKey, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      /* swallow — orphaned blob will be GC'd later */
    }
  }
  await db
    .update(importJob)
    .set({ fileKey: null, status: "committed", summary })
    .where(eq(importJob.id, jobId));
}
