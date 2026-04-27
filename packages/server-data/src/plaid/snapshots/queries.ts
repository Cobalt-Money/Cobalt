import { db } from "@cobalt-web/db";
import { snapshot } from "@cobalt-web/db/schema/banking/balances/snapshot";
import { financialAccount } from "@cobalt-web/db/schema/banking/financial-account";
import { transaction } from "@cobalt-web/db/schema/banking/transactions/transaction";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import { lookupFinancialAccountsByPlaidIds } from "../link/queries.js";
import { toBalanceSnapshotDTO } from "./lib.js";
import type { BalanceSnapshot, BalanceSnapshotQuery } from "./schemas.js";

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

/**
 * Get balance snapshots with enriched account metadata. Joins
 * `snapshot ⨝ financial_account` and scopes by `snapshot.userId`.
 *
 * `filters.accountId` is a provider external id (Plaid account_id).
 */
export async function getBalanceSnapshotsByUserId(
  userId: string,
  filters: BalanceSnapshotQuery
): Promise<BalanceSnapshot[]> {
  const conditions = [eq(snapshot.userId, userId)];
  if (filters.accountId) {
    conditions.push(eq(financialAccount.externalId, filters.accountId));
  }
  if (filters.startDate) {
    conditions.push(gte(snapshot.snapshotDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(snapshot.snapshotDate, filters.endDate));
  }

  const rows = await db
    .select({
      available: snapshot.available,
      createdAt: snapshot.createdAt,
      current: snapshot.current,
      externalId: financialAccount.externalId,
      id: snapshot.id,
      institutionName: financialAccount.institutionName,
      limit: snapshot.limit,
      name: financialAccount.name,
      snapshotDate: snapshot.snapshotDate,
      subtype: financialAccount.subtype,
      type: financialAccount.type,
    })
    .from(snapshot)
    .innerJoin(financialAccount, eq(snapshot.accountId, financialAccount.id))
    .where(and(...conditions))
    .orderBy(asc(snapshot.snapshotDate));

  return rows.map((row) =>
    toBalanceSnapshotDTO({
      account: {
        externalId: row.externalId,
        institutionName: row.institutionName,
        name: row.name,
        subtype: row.subtype,
        type: row.type,
      },
      available: row.available,
      createdAt: row.createdAt,
      current: row.current,
      id: row.id,
      limit: row.limit,
      snapshotDate: row.snapshotDate,
    })
  );
}
