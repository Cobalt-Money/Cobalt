import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { and, eq, isNull } from "drizzle-orm";

import type { AccountMapBody, AccountMapEntry } from "./schemas";

/**
 * Persist the account-mapping decisions on the job. Validates ownership of any
 * `existing`-kind targets so users can't map staged rows onto another user's account.
 */
export async function setAccountMap(
  userId: string,
  jobId: string,
  body: AccountMapBody,
): Promise<void> {
  const job = await db.query.importJob.findFirst({
    columns: { id: true, userId: true },
    where: { id: { eq: jobId } },
  });
  if (!job || job.userId !== userId) {
    throw new Error("Import job not found");
  }

  const existingAccountIds = Object.values(body.mapping)
    .filter(
      (entry): entry is Extract<AccountMapEntry, { kind: "existing" }> => entry.kind === "existing",
    )
    .map((entry) => entry.accountId);
  if (existingAccountIds.length > 0) {
    const owned = await db.query.financialAccount.findMany({
      columns: { id: true },
      where: {
        userId: { eq: userId },
      },
    });
    const ownedSet = new Set(owned.map((a) => a.id));
    for (const id of existingAccountIds) {
      if (!ownedSet.has(id)) {
        throw new Error(`Cannot map to unowned account ${id}`);
      }
    }
  }

  await db
    .update(importJob)
    .set({ accountMap: body.mapping as unknown as Record<string, string>, status: "mapped" })
    .where(eq(importJob.id, jobId));
}

/**
 * Resolve `accountMap` to concrete `financial_account.id`s, creating manual accounts
 * for `kind: "create"` entries. Idempotent: re-running with the same map produces
 * the same created accounts only on first call (caller skips if already resolved).
 */
export async function resolveAccountMap(
  userId: string,
  jobId: string,
): Promise<Map<string, { accountId: string | null; skip: boolean }>> {
  const job = await db.query.importJob.findFirst({
    columns: { accountMap: true, userId: true },
    where: { id: { eq: jobId } },
  });
  if (!job || job.userId !== userId || !job.accountMap) {
    throw new Error("Import job has no account map");
  }
  const map = job.accountMap as unknown as AccountMapBody["mapping"];

  const resolved = new Map<string, { accountId: string | null; skip: boolean }>();
  for (const [sourceName, entry] of Object.entries(map)) {
    if (entry.kind === "skip") {
      resolved.set(sourceName, { accountId: null, skip: true });
      continue;
    }
    if (entry.kind === "existing") {
      resolved.set(sourceName, { accountId: entry.accountId, skip: false });
      continue;
    }
    // create — atomic insert mirroring SRI-315 createAccount mutator
    const [created] = await db
      .insert(financialAccount)
      .values({
        name: entry.name.trim(),
        source: "manual",
        subtype: entry.subtype.trim(),
        type: entry.type,
        userId,
      })
      .returning({ id: financialAccount.id });
    if (!created) {
      throw new Error(`Failed to create account for "${sourceName}"`);
    }
    await db.insert(balance).values({
      accountId: created.id,
      currency: "USD",
      current: "0",
      userId,
    });
    resolved.set(sourceName, { accountId: created.id, skip: false });
  }
  return resolved;
}

/**
 * Commit non-duplicate staged rows into `transaction`. Rows whose source account
 * mapped to `skip` or whose `dedupeMatchId` was set during the dedupe pass are
 * excluded. Marks the job `committed` on success.
 */
export async function commitStagedTransactions(
  userId: string,
  jobId: string,
  resolved: Map<string, { accountId: string | null; skip: boolean }>,
): Promise<{ committed: number; skipped: number }> {
  const staged = await db.query.importStagedTransaction.findMany({
    where: {
      dedupeMatchId: { isNull: true },
      importJobId: { eq: jobId },
      parseError: { isNull: true },
    },
  });

  const insertable = staged
    .map((row) => {
      const target = resolved.get(row.sourceAccountName);
      if (!target || target.skip || !target.accountId) {
        return null;
      }
      return {
        accountId: target.accountId,
        amount: row.amount,
        date: row.date,
        externalId: row.externalId,
        importJobId: jobId,
        merchantName: row.merchant,
        name: row.merchant || row.originalDescription || "Untitled",
        notes: row.notes,
        pending: false,
        source: "manual" as const,
        userId,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  await db.transaction(async (tx) => {
    if (insertable.length > 0) {
      await tx.insert(transaction).values(insertable);
    }
    await tx
      .update(importJob)
      .set({ fileKey: null, status: "committed" })
      .where(eq(importJob.id, jobId));
  });

  return { committed: insertable.length, skipped: staged.length - insertable.length };
}

/** Mark a job failed with the given error message (called from workflow error handlers). */
export async function markImportJobFailed(jobId: string, message: string): Promise<void> {
  await db
    .update(importJob)
    .set({ errorMessage: message, status: "failed" })
    .where(and(eq(importJob.id, jobId), isNull(importJob.errorMessage)));
}
