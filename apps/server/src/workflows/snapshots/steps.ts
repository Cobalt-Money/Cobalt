import { getAllAccountsWithInstitutions } from "@cobalt-web/server-data/accounts/queries";
import {
  findBankConnectionIdsByUser,
  findBankAccountIdsByItemIds,
  findBankBalancesByAccountIds,
} from "@cobalt-web/server-data/banking/queries";
import { insertBankBalanceSnapshots } from "@cobalt-web/server-data/banking/snapshots-mutations";
import { findBrokerageAccountById } from "@cobalt-web/server-data/brokerage/queries";
import {
  deletePortfolioSnapshotsByAccountIds,
  upsertPortfolioSnapshots,
  upsertBrokerageSnapshot,
} from "@cobalt-web/server-data/brokerage/snapshot-mutations";
import { getSnaptradeBrokerageAccountsByUserId } from "@cobalt-web/server-data/brokerage/snaptrade/queries";
import { getTodayDateOnly } from "@cobalt-web/server-data/lib/date";
import type { Account, Balance } from "snaptrade-typescript-sdk";

// ============================================================================
// Helper: Parse balance values from SnapTrade responses
// ============================================================================

function parseSnapTradeBalanceValues(
  balancesData: Balance[],
  accountDetailsData: Account | undefined
): {
  cashValue: number;
  buyingPower: number;
  primaryCurrency: string;
  totalValue: number;
  positionsValue: number;
} {
  const balances = Array.isArray(balancesData) ? balancesData : [balancesData];

  let cashValue = 0;
  let buyingPower = 0;
  let primaryCurrency = "USD";

  for (const balance of balances) {
    const b = balance as Record<string, unknown>;
    if ((b.currency as { code?: string })?.code) {
      primaryCurrency = (b.currency as { code: string }).code;
    }

    const { cash } = b;
    if (typeof cash === "number") {
      cashValue += cash;
    } else if (cash && typeof cash === "string") {
      cashValue += Number.parseFloat(cash);
    }

    const bp =
      b.buying_power ?? (b as { buyingPower?: number | string }).buyingPower;
    if (typeof bp === "number") {
      buyingPower += bp;
    } else if (bp && typeof bp === "string") {
      buyingPower += Number.parseFloat(bp);
    }
  }

  let totalValue = cashValue;
  if (accountDetailsData?.balance) {
    const balanceJson = accountDetailsData.balance as Record<string, unknown>;
    const { total } = balanceJson;
    if (typeof total === "number") {
      totalValue = total;
    } else if (total && typeof total === "object" && "amount" in total) {
      totalValue = Number.parseFloat(
        String((total as { amount: number }).amount)
      );
    }
  }

  const positionsValue = Math.max(0, totalValue - cashValue);

  return {
    buyingPower,
    cashValue,
    positionsValue,
    primaryCurrency,
    totalValue,
  };
}

// ============================================================================
// STEP 1: Plaid Balance Snapshots
// ============================================================================

/**
 * Step: Create balance snapshots for all Plaid accounts belonging to a user.
 * Orchestrates query primitives and inserts snapshots.
 */
export async function createPlaidBalanceSnapshotsForUserStep(
  userId: string
): Promise<{ upserted: number }> {
  "use step";

  const snapshotDate = getTodayDateOnly();

  // Query 1: Find connections for user
  const plaidItemIds = await findBankConnectionIdsByUser(userId);
  if (plaidItemIds.length === 0) {
    return { upserted: 0 };
  }

  // Query 2: Find accounts for those connections
  const plaidAccountIds = await findBankAccountIdsByItemIds(plaidItemIds);
  if (plaidAccountIds.length === 0) {
    return { upserted: 0 };
  }

  // Query 3: Find all balances for those accounts
  const allBalances = await findBankBalancesByAccountIds(plaidAccountIds);
  if (allBalances.length === 0) {
    return { upserted: 0 };
  }

  // Business logic: Deduplicate to get latest balance per account
  // (processed in reverse since results are ordered by updatedAt asc)
  const seenAccounts = new Set<string>();
  const latestBalances: typeof allBalances = [];

  for (let i = allBalances.length - 1; i >= 0; i -= 1) {
    const balance = allBalances[i];
    if (!balance) {
      continue;
    }
    if (!seenAccounts.has(balance.plaidAccountId)) {
      seenAccounts.add(balance.plaidAccountId);
      latestBalances.unshift(balance);
    }
  }

  if (latestBalances.length === 0) {
    return { upserted: 0 };
  }

  // Build snapshot values
  const values = latestBalances.map((bal) => ({
    availableBalance: bal.available ?? null,
    creditLimit: bal.limit ?? null,
    currentBalance: bal.current ?? 0,
    plaidAccountId: bal.plaidAccountId,
    snapshotDate,
    snapshotSource: "cron",
  }));

  // Insert snapshots
  await insertBankBalanceSnapshots(values);

  return { upserted: latestBalances.length };
}

// ============================================================================
// STEP 2: SnapTrade Brokerage Snapshots
// ============================================================================

/**
 * Step: Create portfolio snapshots for all SnapTrade brokerage accounts belonging to a user.
 * Reads account details + balances from our own DB via getSnaptradeBrokerageAccountsByUserId
 * (already synced by the SnapTrade holdings webhook), queries the brokerage account,
 * parses balance values, and upserts the snapshot.
 */
export async function createSnapTradeSnapshotsForUserStep(
  userId: string
): Promise<{ created: number }> {
  "use step";

  const snapshotDate = getTodayDateOnly();
  let created = 0;

  const accounts = await getSnaptradeBrokerageAccountsByUserId(userId);

  // Filter for open/active accounts only
  const activeAccounts = accounts.filter(
    (acc) => acc.accountStatus === "open" || acc.accountStatus === "active"
  );

  if (activeAccounts.length === 0) {
    return { created: 0 };
  }

  const results = await Promise.allSettled(
    activeAccounts.map(async (account) => {
      // Step 1: Query the brokerage account with ownership check
      const accountRecord = await findBrokerageAccountById(account.id, userId);
      if (!accountRecord) {
        return { error: "Account not found or access denied", success: false };
      }

      // Step 2: Shape SnapTrade data and parse balances (business logic)
      const { accountDetails } = account;
      const detailsData =
        accountDetails?.balance === null ||
        accountDetails?.balance === undefined
          ? undefined
          : ({ balance: accountDetails.balance } as unknown as Account);

      const balancesData = account.balances.map((bal) => ({
        buying_power: bal.buyingPower ?? 0,
        cash: bal.cash ?? 0,
        currency: { code: bal.currencyCode || "USD" },
      })) as Balance[];

      const {
        cashValue,
        buyingPower,
        primaryCurrency,
        totalValue,
        positionsValue,
      } = parseSnapTradeBalanceValues(balancesData, detailsData);

      // Step 3: Upsert the snapshot
      await upsertBrokerageSnapshot({
        accountId: accountRecord.accountId,
        accountName: accountRecord.accountName ?? "Brokerage Account",
        accountType: "brokerage",
        buyingPower: buyingPower.toString(),
        cashValue: cashValue.toString(),
        currencyCode: primaryCurrency,
        institutionName: accountRecord.institutionName ?? "Unknown Institution",
        positionsCount: 0,
        positionsValue: positionsValue.toString(),
        rawBalanceData: {
          accountDetails: detailsData,
          balances: balancesData,
          snapshotSource: "cron",
        },
        snapTradeAccountId: account.id,
        snapshotDate,
        totalValue: totalValue.toString(),
        userId: accountRecord.userId,
      });

      return { success: true };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      created += 1;
    }
  }

  return { created };
}

// ============================================================================
// STEP 3: Plaid Investment Snapshots
// ============================================================================

/**
 * Step: Create portfolio snapshots for Plaid investment accounts belonging to a user.
 * Business logic: filter investment accounts, exclude cash accounts, map to snapshots.
 */
export async function createPlaidInvestmentSnapshotsForUserStep(
  userId: string
): Promise<{ created: number }> {
  "use step";

  const snapshotDate = getTodayDateOnly();

  // Query all accounts with institutions
  const allAccounts = await getAllAccountsWithInstitutions(userId);

  // Business logic: filter for investment accounts
  const investmentAccounts = allAccounts.filter(
    (account) => account.type === "investment"
  );

  if (investmentAccounts.length === 0) {
    return { created: 0 };
  }

  // Business logic: separate cash and non-cash accounts
  const cashAccountIds = investmentAccounts
    .filter((a) => a.subtype === "cash")
    .map((a) => a.plaidAccountId);

  const nonCashAccounts = investmentAccounts.filter(
    (account) => account.subtype !== "cash"
  );

  // Delete snapshots for cash accounts (they shouldn't have portfolio snapshots)
  if (cashAccountIds.length > 0) {
    await deletePortfolioSnapshotsByAccountIds(userId, cashAccountIds);
  }

  if (nonCashAccounts.length === 0) {
    return { created: 0 };
  }

  // Business logic: map accounts to snapshot values, filtering out non-positive balances
  const values = nonCashAccounts
    .map((account) => {
      const currentBalance = Number.parseFloat(String(account.current || "0"));
      if (currentBalance <= 0) {
        return null;
      }

      return {
        accountId: account.plaidAccountId,
        accountName: account.name || "Investment Account",
        accountType: "bank" as const,
        buyingPower: "0",
        cashValue: currentBalance.toString(),
        currencyCode: account.currency || "USD",
        institutionName: account.institutionName || "Bank Account",
        positionsCount: 0,
        positionsValue: "0",
        rawBalanceData: {
          bankAccount: account,
          snapshotSource: "cron",
        },
        snapTradeAccountId: null,
        snapshotDate,
        totalValue: currentBalance.toString(),
        userId,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (values.length === 0) {
    return { created: 0 };
  }

  // Insert/upsert snapshots
  await upsertPortfolioSnapshots(values);

  return { created: values.length };
}
