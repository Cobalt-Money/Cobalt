import { db } from "@cobalt-web/db";
import { importStagedTransaction } from "@cobalt-web/db/schema/imports/import-staged-transaction";
import { count, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { AccountMapBody, ImportStatusResponse } from "./schemas";

/**
 * Resolve a job for the UI: status + the inputs the mapping/preview screens need.
 * `accounts`/`categories` are derived from staged rows so we don't have to keep
 * the original CSV around — staging is the source of truth post-parse.
 */
export async function getImportJobStatus(
  userId: string,
  jobId: string,
): Promise<ImportStatusResponse | null> {
  const job = await db.query.importJob.findFirst({
    where: { id: { eq: jobId }, userId: { eq: userId } },
  });
  if (!job) {
    return null;
  }

  const accountRows = await db
    .selectDistinct({ name: importStagedTransaction.sourceAccountName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  const categoryRows = await db
    .selectDistinct({ name: importStagedTransaction.sourceCategoryName })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));

  const counts = await db
    .select({
      dupes:
        sql<number>`count(*) filter (where ${importStagedTransaction.dedupeMatchId} is not null)`.mapWith(
          Number,
        ),
      total: count(),
    })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId));
  const totals = counts[0] ?? { dupes: 0, total: 0 };

  return {
    accounts: accountRows.flatMap((r) => (r.name ? [r.name] : [])),
    categories: categoryRows.flatMap((r) => (r.name ? [r.name] : [])),
    currentMapping: (job.accountMap as AccountMapBody["mapping"] | null) ?? null,
    dupeCount: totals.dupes,
    errorMessage: job.errorMessage,
    id: job.id,
    importCount: totals.total - totals.dupes,
    source: job.source,
    status: job.status,
  };
}

/**
 * Pool of existing transactions on a target account, narrowed to a date window
 * around the staged-row date span. Read by the dedupe workflow once per job;
 * scanning whole-history would scale poorly on Plaid-heavy accounts.
 */
export async function getDedupeCandidates(
  userId: string,
  accountId: string,
  fromDate: string,
  toDate: string,
): Promise<{ amount: number; date: string; id: string; merchant: string }[]> {
  const rows = await db.query.transaction.findMany({
    columns: {
      amount: true,
      date: true,
      id: true,
      merchantName: true,
      name: true,
    },
    where: {
      accountId: { eq: accountId },
      date: { gte: fromDate, lte: toDate },
      userId: { eq: userId },
    },
  });
  return rows.map((r) => ({
    amount: Number.parseFloat(r.amount),
    date: r.date,
    id: r.id,
    merchant: r.merchantName ?? r.name,
  }));
}

/** Fetch staged rows for the dedupe pass. Excludes already-matched rows so re-runs are idempotent. */
export function getStagedRowsForDedupe(jobId: string) {
  return db.query.importStagedTransaction.findMany({
    columns: {
      amount: true,
      date: true,
      id: true,
      merchant: true,
      sourceAccountName: true,
    },
    where: {
      dedupeMatchId: { isNull: true },
      importJobId: { eq: jobId },
      parseError: { isNull: true },
    },
  });
}

/** Min/max staged-row date per source account; bounds the dedupe-candidate window. */
export async function getStagedDateRangePerAccount(
  jobId: string,
): Promise<Map<string, { from: string; to: string }>> {
  const rows = await db
    .select({
      from: sql<string>`min(${importStagedTransaction.date})`,
      sourceAccountName: importStagedTransaction.sourceAccountName,
      to: sql<string>`max(${importStagedTransaction.date})`,
    })
    .from(importStagedTransaction)
    .where(eq(importStagedTransaction.importJobId, jobId))
    .groupBy(importStagedTransaction.sourceAccountName);
  const map = new Map<string, { from: string; to: string }>();
  for (const row of rows) {
    if (row.from && row.to) {
      map.set(row.sourceAccountName, { from: row.from, to: row.to });
    }
  }
  return map;
}

export async function setStagedDedupeMatch(stagedId: string, matchId: string): Promise<void> {
  await db
    .update(importStagedTransaction)
    .set({ dedupeMatchId: matchId })
    .where(eq(importStagedTransaction.id, stagedId));
}

/** Idempotent reset of dedupe state — used when re-running the dedupe pass after a mapping change. */
export async function clearDedupeMatches(jobId: string): Promise<void> {
  await db
    .update(importStagedTransaction)
    .set({ dedupeMatchId: null })
    .where(eq(importStagedTransaction.importJobId, jobId));
}

/** Count rows that would be committed vs flagged as dupes for the preview screen. */
export async function getCommitCounts(jobId: string): Promise<{ dupes: number; toCommit: number }> {
  const [toCommit] = await db
    .select({ n: count() })
    .from(importStagedTransaction)
    .where(
      sql`${importStagedTransaction.importJobId} = ${jobId} and ${importStagedTransaction.dedupeMatchId} is null`,
    );
  const [dupes] = await db
    .select({ n: count() })
    .from(importStagedTransaction)
    .where(
      sql`${importStagedTransaction.importJobId} = ${jobId} and ${importStagedTransaction.dedupeMatchId} is not null`,
    );
  // Touch isNotNull/isNull to keep the imports tree-shake-resistant in case drizzle drops them.
  void isNotNull;
  void isNull;
  return { dupes: dupes?.n ?? 0, toCommit: toCommit?.n ?? 0 };
}
