import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
  bankConnection,
} from "@cobalt-web/db/schema/banking";
import {
  brokerageAccountDetails,
  brokerageAccounts,
  brokerageBalances,
  portfolioSnapshots,
} from "@cobalt-web/db/schema/brokerage";
import type { PortfolioSnapshotInsert } from "@cobalt-web/db/schema/brokerage";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

const BATCH_SIZE = 100;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Upserts a daily bank_balance_snapshot per Plaid account for a user, using
 * the latest bank_balance row (already kept current by sync/webhook).
 * Called by the daily snapshots cron.
 */
export async function upsertBankBalanceSnapshotsForUser(
  userId: string,
  source: string
): Promise<{ upserted: number }> {
  const snapshotDate = todayIso();

  const latest = await db
    .selectDistinctOn([bankBalance.plaidAccountId], {
      available: bankBalance.available,
      current: bankBalance.current,
      limit: bankBalance.limit,
      plaidAccountId: bankBalance.plaidAccountId,
    })
    .from(bankBalance)
    .innerJoin(
      bankAccount,
      eq(bankBalance.plaidAccountId, bankAccount.plaidAccountId)
    )
    .innerJoin(
      bankConnection,
      eq(bankAccount.plaidItemId, bankConnection.plaidItemId)
    )
    .where(eq(bankConnection.userId, userId))
    .orderBy(bankBalance.plaidAccountId, desc(bankBalance.updatedAt));

  if (latest.length === 0) {
    return { upserted: 0 };
  }

  const rows = latest.map((b) => ({
    availableBalance: b.available,
    creditLimit: b.limit,
    currentBalance: b.current ?? 0,
    plaidAccountId: b.plaidAccountId,
    snapshotDate,
    snapshotSource: source,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(bankBalanceSnapshot)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          availableBalance: sql`excluded.available_balance`,
          creditLimit: sql`excluded.credit_limit`,
          currentBalance: sql`excluded.current_balance`,
        },
        target: [
          bankBalanceSnapshot.plaidAccountId,
          bankBalanceSnapshot.snapshotDate,
        ],
      });
  }

  return { upserted: rows.length };
}

/**
 * Upserts a daily portfolio_snapshot per active SnapTrade brokerage account
 * for a user, summing cash / buying-power across per-currency balance rows
 * and reading total value from the account-detail JSON.
 */
export async function upsertSnapTradePortfolioSnapshotsForUser(
  userId: string,
  source: string
): Promise<{ upserted: number }> {
  const snapshotDate = todayIso();

  const accountRows = await db
    .select({
      accountId: brokerageAccounts.accountId,
      detailBalance: brokerageAccountDetails.balance,
      institutionName: brokerageAccounts.institutionName,
      name: brokerageAccounts.name,
      userId: brokerageAccounts.userId,
    })
    .from(brokerageAccounts)
    .leftJoin(
      brokerageAccountDetails,
      eq(
        brokerageAccountDetails.snapTradeAccountId,
        brokerageAccounts.accountId
      )
    )
    .where(
      and(
        eq(brokerageAccounts.userId, userId),
        or(
          eq(brokerageAccounts.accountStatus, "open"),
          eq(brokerageAccounts.accountStatus, "active")
        )
      )
    );

  if (accountRows.length === 0) {
    return { upserted: 0 };
  }

  const accountIds = accountRows.map((a) => a.accountId);
  const balanceRows = await db
    .select({
      buyingPower: brokerageBalances.buyingPower,
      cash: brokerageBalances.cash,
      currencyCode: brokerageBalances.currencyCode,
      snapTradeAccountId: brokerageBalances.snapTradeAccountId,
    })
    .from(brokerageBalances)
    .where(
      and(
        eq(brokerageBalances.userId, userId),
        inArray(brokerageBalances.snapTradeAccountId, accountIds)
      )
    );

  const balancesByAccount = new Map<string, typeof balanceRows>();
  for (const row of balanceRows) {
    const list = balancesByAccount.get(row.snapTradeAccountId) ?? [];
    list.push(row);
    balancesByAccount.set(row.snapTradeAccountId, list);
  }

  const rows: PortfolioSnapshotInsert[] = accountRows.map((account) => {
    const balances = balancesByAccount.get(account.accountId) ?? [];

    let cashValue = 0;
    let buyingPower = 0;
    let currencyCode = "USD";
    for (const b of balances) {
      if (b.currencyCode) {
        ({ currencyCode } = b);
      }
      if (b.cash) {
        cashValue += Number(b.cash);
      }
      if (b.buyingPower) {
        buyingPower += Number(b.buyingPower);
      }
    }

    let totalValue = cashValue;
    const balanceJson = account.detailBalance as Record<string, unknown> | null;
    const total = balanceJson?.total;
    if (typeof total === "number") {
      totalValue = total;
    } else if (total && typeof total === "object" && "amount" in total) {
      totalValue = Number.parseFloat(
        String((total as { amount: number }).amount)
      );
    }
    const positionsValue = Math.max(0, totalValue - cashValue);

    return {
      accountId: account.accountId,
      accountName: account.name ?? null,
      accountType: "brokerage",
      buyingPower: buyingPower.toString(),
      cashValue: cashValue.toString(),
      currencyCode,
      institutionName: account.institutionName ?? null,
      positionsCount: 0,
      positionsValue: positionsValue.toString(),
      rawBalanceData: { balances, source },
      snapTradeAccountId: account.accountId,
      snapshotDate,
      totalValue: totalValue.toString(),
      userId: account.userId,
    } satisfies PortfolioSnapshotInsert;
  });

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(portfolioSnapshots)
      .values(batch)
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

  return { upserted: rows.length };
}

/**
 * Upserts a daily portfolio_snapshot per Plaid investment account for a user.
 * Cash-sweep subtype ("cash") accounts are excluded from snapshots *and*
 * historical rows for them are removed (matches sandbox cleanup behavior so
 * they don't linger in the net-worth chart after the rule changed).
 */
export async function upsertPlaidInvestmentSnapshotsForUser(
  userId: string,
  source: string
): Promise<{ upserted: number }> {
  const snapshotDate = todayIso();

  const investmentAccounts = await db
    .selectDistinctOn([bankAccount.plaidAccountId], {
      currentBalance: bankBalance.current,
      institutionName: bankConnection.institutionName,
      isoCurrencyCode: bankBalance.isoCurrencyCode,
      name: bankAccount.name,
      plaidAccountId: bankAccount.plaidAccountId,
      subtype: bankAccount.subtype,
    })
    .from(bankAccount)
    .innerJoin(
      bankConnection,
      eq(bankAccount.plaidItemId, bankConnection.plaidItemId)
    )
    .leftJoin(
      bankBalance,
      eq(bankBalance.plaidAccountId, bankAccount.plaidAccountId)
    )
    .where(
      and(eq(bankConnection.userId, userId), eq(bankAccount.type, "investment"))
    )
    .orderBy(bankAccount.plaidAccountId, desc(bankBalance.updatedAt));

  const cashAccountIds = investmentAccounts
    .filter((a) => a.subtype === "cash")
    .map((a) => a.plaidAccountId);
  if (cashAccountIds.length > 0) {
    await db
      .delete(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.userId, userId),
          inArray(portfolioSnapshots.accountId, cashAccountIds)
        )
      );
  }

  const rows: PortfolioSnapshotInsert[] = [];
  for (const account of investmentAccounts) {
    if (account.subtype === "cash") {
      continue;
    }
    const currentBalance = account.currentBalance ?? 0;
    if (currentBalance <= 0) {
      continue;
    }

    rows.push({
      accountId: account.plaidAccountId,
      accountName: account.name ?? "Investment Account",
      accountType: "bank",
      buyingPower: "0",
      cashValue: currentBalance.toString(),
      currencyCode: account.isoCurrencyCode ?? "USD",
      institutionName: account.institutionName ?? "Bank Account",
      positionsCount: 0,
      positionsValue: "0",
      rawBalanceData: { account, source },
      snapTradeAccountId: null,
      snapshotDate,
      totalValue: currentBalance.toString(),
      userId,
    } satisfies PortfolioSnapshotInsert);
  }

  if (rows.length === 0) {
    return { upserted: 0 };
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(portfolioSnapshots)
      .values(batch)
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

  return { upserted: rows.length };
}
