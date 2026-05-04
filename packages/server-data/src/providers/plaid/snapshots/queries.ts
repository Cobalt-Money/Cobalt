import { db } from "@cobalt-web/db";

import { lookupFinancialAccountsByPlaidIds } from "../link/queries.js";

/**
 * Posted transactions for a Plaid account, newest-first. Used by backfill to
 * reconstruct historical daily balances.
 */
export async function getPostedTransactionsForAccount(
  plaidAccountId: string,
): Promise<{ amount: number; date: string }[]> {
  const map = await lookupFinancialAccountsByPlaidIds([plaidAccountId]);
  const acct = map.get(plaidAccountId);
  if (!acct) {
    return [];
  }
  const rows = await db.query.transaction.findMany({
    columns: { amount: true, date: true },
    orderBy: { date: "desc" },
    where: {
      accountId: { eq: acct.id },
      pending: { eq: false },
    },
  });
  return rows.map((r) => ({ amount: Number(r.amount), date: r.date }));
}

/** Existing snapshot dates for a Plaid account — used to skip already-persisted rows. */
export async function getSnapshotDatesForAccount(plaidAccountId: string): Promise<string[]> {
  const map = await lookupFinancialAccountsByPlaidIds([plaidAccountId]);
  const acct = map.get(plaidAccountId);
  if (!acct) {
    return [];
  }
  const rows = await db.query.snapshot.findMany({
    columns: { snapshotDate: true },
    where: { accountId: { eq: acct.id } },
  });
  return rows.map((r) => r.snapshotDate);
}
