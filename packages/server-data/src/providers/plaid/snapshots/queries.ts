import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { and, desc, eq } from "drizzle-orm";

import { lookupFinancialAccountsByPlaidIds } from "../link/queries.js";

/**
 * Posted transactions for a Plaid account, newest-first. Used by backfill to
 * reconstruct historical daily balances.
 */
export async function getPostedTransactionsForAccount(
  plaidAccountId: string
): Promise<{ amount: number; date: string }[]> {
  const map = await lookupFinancialAccountsByPlaidIds([plaidAccountId]);
  const acct = map.get(plaidAccountId);
  if (!acct) {
    return [];
  }
  const rows = await db
    .select({ amount: transaction.amount, date: transaction.date })
    .from(transaction)
    .where(
      and(eq(transaction.accountId, acct.id), eq(transaction.pending, false))
    )
    .orderBy(desc(transaction.date));
  return rows.map((r) => ({ amount: Number(r.amount), date: r.date }));
}

/** Existing snapshot dates for a Plaid account — used to skip already-persisted rows. */
export async function getSnapshotDatesForAccount(
  plaidAccountId: string
): Promise<string[]> {
  const map = await lookupFinancialAccountsByPlaidIds([plaidAccountId]);
  const acct = map.get(plaidAccountId);
  if (!acct) {
    return [];
  }
  const rows = await db
    .select({ date: snapshot.snapshotDate })
    .from(snapshot)
    .where(eq(snapshot.accountId, acct.id));
  return rows.map((r) => r.date);
}
