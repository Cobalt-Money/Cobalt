import { db } from "@cobalt-web/db";
import { portfolioSnapshots } from "@cobalt-web/db/schema/brokerage";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Delete portfolio snapshots for given account IDs belonging to a user.
 */
export async function deletePortfolioSnapshotsByAccountIds(
  userId: string,
  accountIds: string[]
): Promise<void> {
  if (accountIds.length === 0) {
    return;
  }

  await db
    .delete(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.userId, userId),
        inArray(portfolioSnapshots.accountId, accountIds)
      )
    );
}

/**
 * Insert or update portfolio snapshots for Plaid investment accounts.
 * Uses ON CONFLICT upsert on (accountId, snapshotDate).
 */
export async function upsertPortfolioSnapshots(
  values: {
    accountId: string;
    accountName: string;
    accountType: "bank" | "brokerage";
    buyingPower: string;
    cashValue: string;
    currencyCode: string;
    institutionName: string;
    positionsCount: number;
    positionsValue: string;
    rawBalanceData: unknown;
    snapTradeAccountId: string | null;
    snapshotDate: string;
    totalValue: string;
    userId: string;
  }[]
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  await db
    .insert(portfolioSnapshots)
    .values(values)
    .onConflictDoUpdate({
      set: {
        accountName: sql`excluded.account_name`,
        buyingPower: sql`excluded.buying_power`,
        cashValue: sql`excluded.cash_value`,
        currencyCode: sql`excluded.currency_code`,
        institutionName: sql`excluded.institution_name`,
        positionsValue: sql`excluded.positions_value`,
        rawBalanceData: sql`excluded.raw_balance_data`,
        totalValue: sql`excluded.total_value`,
      },
      target: [portfolioSnapshots.accountId, portfolioSnapshots.snapshotDate],
    });
}

/**
 * Insert or update a single brokerage portfolio snapshot.
 * Uses ON CONFLICT upsert — safe to call multiple times per day.
 */
export async function upsertBrokerageSnapshot(params: {
  accountId: string;
  accountName: string;
  accountType: "brokerage";
  buyingPower: string;
  cashValue: string;
  currencyCode: string;
  institutionName: string;
  positionsCount: number;
  positionsValue: string;
  rawBalanceData: unknown;
  snapTradeAccountId: string;
  snapshotDate: string;
  totalValue: string;
  userId: string;
}): Promise<void> {
  await db
    .insert(portfolioSnapshots)
    .values({
      accountId: params.accountId,
      accountName: params.accountName,
      accountType: params.accountType,
      buyingPower: params.buyingPower,
      cashValue: params.cashValue,
      currencyCode: params.currencyCode,
      institutionName: params.institutionName,
      positionsCount: params.positionsCount,
      positionsValue: params.positionsValue,
      rawBalanceData: params.rawBalanceData,
      snapTradeAccountId: params.snapTradeAccountId,
      snapshotDate: params.snapshotDate,
      totalValue: params.totalValue,
      userId: params.userId,
    })
    .onConflictDoUpdate({
      set: {
        accountName: sql`excluded.account_name`,
        buyingPower: sql`excluded.buying_power`,
        cashValue: sql`excluded.cash_value`,
        currencyCode: sql`excluded.currency_code`,
        institutionName: sql`excluded.institution_name`,
        positionsValue: sql`excluded.positions_value`,
        rawBalanceData: sql`excluded.raw_balance_data`,
        totalValue: sql`excluded.total_value`,
      },
      target: [portfolioSnapshots.accountId, portfolioSnapshots.snapshotDate],
    });
}
