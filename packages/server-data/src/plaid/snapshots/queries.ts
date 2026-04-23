import { db } from "@cobalt-web/db";
import {
  bankBalanceSnapshot,
  transaction,
} from "@cobalt-web/db/schema/banking";
import { and, desc, eq } from "drizzle-orm";

import { toBalanceSnapshotDTO } from "./lib.js";
import type { BalanceSnapshot, BalanceSnapshotQuery } from "./schemas.js";

/**
 * Posted transactions for a Plaid account, newest-first. Used by backfill to
 * reconstruct historical daily balances.
 */
export async function getPostedTransactionsForAccount(
  plaidAccountId: string
): Promise<{ amount: number; date: string }[]> {
  return await db
    .select({ amount: transaction.amount, date: transaction.date })
    .from(transaction)
    .where(
      and(
        eq(transaction.plaidAccountId, plaidAccountId),
        eq(transaction.pending, false)
      )
    )
    .orderBy(desc(transaction.date));
}

/** Existing snapshot dates for a Plaid account — used to skip already-persisted rows. */
export async function getSnapshotDatesForAccount(
  plaidAccountId: string
): Promise<string[]> {
  const rows = await db
    .select({ date: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, plaidAccountId));
  return rows.map((r) => r.date);
}

/**
 * Get balance snapshots with enriched account metadata.
 * Relational: snapshot → account → connection (user scoping on connection.userId).
 */
export async function getBalanceSnapshotsByUserId(
  userId: string,
  filters: BalanceSnapshotQuery
): Promise<BalanceSnapshot[]> {
  const whereParts = [
    { account: { connection: { userId: { eq: userId } } } },
  ] as const;

  const withFilters = [
    ...whereParts,
    ...(filters.accountId
      ? [{ plaidAccountId: { eq: filters.accountId } } as const]
      : []),
    ...(filters.startDate
      ? [{ snapshotDate: { gte: filters.startDate } } as const]
      : []),
    ...(filters.endDate
      ? [{ snapshotDate: { lte: filters.endDate } } as const]
      : []),
  ];

  const rows = await db.query.bankBalanceSnapshot.findMany({
    orderBy: { snapshotDate: "asc" },
    where: { AND: withFilters },
    with: {
      account: {
        with: {
          connection: true,
        },
      },
    },
  });

  return rows.flatMap((row) =>
    row.account === null
      ? []
      : [toBalanceSnapshotDTO({ ...row, account: row.account })]
  );
}
