import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import type {
  AccountResolution,
  CategoryResolution,
} from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { env } from "@cobalt-web/env/server";
import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";

import { hashImportRow } from "../shared/dedupe-hash";

export async function applyPendingRenames(
  userId: string,
  renames: CategoryResolution["pendingRenames"],
): Promise<void> {
  for (const r of renames) {
    await db
      .update(category)
      .set({ name: r.newName })
      .where(and(eq(category.id, r.categoryId), eq(category.userId, userId)));
  }
}

export async function applyPendingCreates(
  userId: string,
  creates: CategoryResolution["pendingCreates"],
  resolutionMap: Record<string, string>,
): Promise<Record<string, string>> {
  if (creates.length === 0) {
    return resolutionMap;
  }
  const group = await db.query.categoryGroup.findFirst({
    columns: { id: true },
    where: { userId: { eq: userId } },
  });
  if (!group) {
    throw new Error("Cannot create categories — no category groups exist for user");
  }
  const updated = { ...resolutionMap };
  for (const c of creates) {
    const [created] = await db
      .insert(category)
      .values({
        groupId: group.id,
        iconKey: c.iconKey,
        name: c.name,
        userId,
      })
      .returning({ id: category.id });
    if (!created) {
      throw new Error(`Failed to create category for "${c.sourceLabel}"`);
    }
    updated[c.sourceLabel] = created.id;
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
        inserts.push(built);
      }
    }

    if (inserts.length > 0) {
      const inserted = await db
        .insert(transaction)
        .values(inserts)
        .onConflictDoNothing({ target: [transaction.userId, transaction.importHash] })
        .returning({ id: transaction.id });
      imported += inserted.length;
      duplicates += inserts.length - inserted.length;
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
    name: row.merchant || row.originalDescription || "Untitled",
    notes: row.notes,
    pending: false,
    source: "manual",
    userId,
  };
}

function resolveAccountId(sourceAccountName: string, resolution: AccountResolution): string | null {
  if (resolution.kind === "single") {
    return resolution.accountId;
  }
  const v = resolution.map[sourceAccountName];
  if (!v || v === "skip") {
    return null;
  }
  return v;
}

export async function startCommit(
  jobId: string,
  workflowRunId: string,
  total: number,
): Promise<void> {
  await db
    .update(importJob)
    .set({
      progress: {
        done: 0,
        startedAt: new Date().toISOString(),
        step: "loading",
        total,
        updatedAt: new Date().toISOString(),
      },
      status: "committing",
      workflowRunId,
    })
    .where(eq(importJob.id, jobId));
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
