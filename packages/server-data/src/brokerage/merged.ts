import type { MappedFinancialEvent } from "../news/events/schemas.js";
import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "../news/for-you/queries.js";
import {
  adaptPlaidHoldingsToPositions,
  adaptPlaidInvestmentAccountsToBrokerage,
  adaptPlaidInvestmentTransactionsToActivities,
} from "./plaid/lib.js";
import type {
  EnhancedBrokerageAccount,
  MergedBrokerageActivity,
  MergedBrokeragePosition,
} from "./plaid/lib.js";
import {
  getPlaidHoldingsByUserId,
  getPlaidInvestmentAccountsByUserId,
  getPlaidInvestmentTransactionsByUserId,
} from "./plaid/queries.js";
import {
  getActivitiesByUserId,
  getBalancesByUserId,
  getPortfolioSnapshotsByUserId,
  getPositionsByUserId,
  getSnaptradeBrokerageAccountsByUserId,
  getUserBrokeragesByUserId,
} from "./snaptrade/queries.js";

export interface GetMergedBrokerageDataOptions {
  activitiesLimit?: number;
  endDate?: string;
  positionsLimit?: number;
  startDate?: string;
}

export interface BrokerageDataResponse {
  accounts: EnhancedBrokerageAccount[];
  activities: MergedBrokerageActivity[];
  activitiesByAccount: Record<string, MergedBrokerageActivity[]>;
  balances: Awaited<ReturnType<typeof getBalancesByUserId>>["balances"];
  balancesByAccount: Awaited<
    ReturnType<typeof getBalancesByUserId>
  >["balancesByAccount"];
  holdingsNews: MappedFinancialEvent[];
  portfolioSnapshots: Awaited<ReturnType<typeof getPortfolioSnapshotsByUserId>>;
  positions: MergedBrokeragePosition[];
  positionsByAccount: Record<string, MergedBrokeragePosition[]>;
  userBrokerages: string[];
}

/**
 * SnapTrade + Plaid investment data in one payload (matches legacy merged brokerage API).
 */
export async function getMergedBrokerageDataByUserId(
  userId: string,
  options: GetMergedBrokerageDataOptions = {}
): Promise<BrokerageDataResponse> {
  const {
    startDate,
    endDate,
    positionsLimit = 50,
    activitiesLimit = 25,
  } = options;

  const [
    snapTradeAccounts,
    balancesResult,
    userBrokerageNames,
    userTickers,
    allPortfolioSnapshots,
    snapTradePositionsResult,
    snapTradeActivitiesResult,
    plaidInvestmentAccounts,
    plaidHoldings,
    plaidInvestmentTransactions,
  ] = await Promise.all([
    getSnaptradeBrokerageAccountsByUserId(userId),
    getBalancesByUserId(userId),
    getUserBrokeragesByUserId(userId),
    getUserStockTickers(userId),
    getPortfolioSnapshotsByUserId(userId, { endDate, startDate }),
    getPositionsByUserId(userId, { limit: positionsLimit }),
    getActivitiesByUserId(userId, { limit: activitiesLimit }),
    getPlaidInvestmentAccountsByUserId(userId),
    getPlaidHoldingsByUserId(userId),
    getPlaidInvestmentTransactionsByUserId(userId, undefined, activitiesLimit),
  ]);

  const stPositions =
    snapTradePositionsResult.positions as unknown as MergedBrokeragePosition[];
  const stActivities =
    snapTradeActivitiesResult.activities as unknown as MergedBrokerageActivity[];

  const plaidPositions = adaptPlaidHoldingsToPositions(plaidHoldings, userId);
  const plaidActivities = adaptPlaidInvestmentTransactionsToActivities(
    plaidInvestmentTransactions,
    userId
  );
  const plaidAccounts = adaptPlaidInvestmentAccountsToBrokerage(
    plaidInvestmentAccounts,
    userId
  );

  const mergedAccounts: EnhancedBrokerageAccount[] = [
    ...snapTradeAccounts,
    ...plaidAccounts,
  ];
  const mergedPositions = [...stPositions, ...plaidPositions];
  const mergedActivities = [...stActivities, ...plaidActivities];

  const mergedPositionsByAccount: Record<string, MergedBrokeragePosition[]> = {
    ...(snapTradePositionsResult.positionsByAccount as Record<
      string,
      MergedBrokeragePosition[]
    >),
  };
  for (const pos of plaidPositions) {
    const key = pos.accountId;
    if (!mergedPositionsByAccount[key]) {
      mergedPositionsByAccount[key] = [];
    }
    mergedPositionsByAccount[key].push(pos);
  }

  const mergedActivitiesByAccount: Record<string, MergedBrokerageActivity[]> = {
    ...(snapTradeActivitiesResult.activitiesByAccount as Record<
      string,
      MergedBrokerageActivity[]
    >),
  };
  for (const act of plaidActivities) {
    const key = act.accountId;
    if (!mergedActivitiesByAccount[key]) {
      mergedActivitiesByAccount[key] = [];
    }
    mergedActivitiesByAccount[key].push(act);
  }

  const plaidBrokerageNames = [
    ...new Set(
      plaidInvestmentAccounts
        .map((a) => a.institutionName)
        .filter((name): name is string => !!name)
    ),
  ];
  const mergedBrokerages = [...userBrokerageNames, ...plaidBrokerageNames];

  let holdingsNews: MappedFinancialEvent[] = [];
  try {
    if (userTickers.length > 0) {
      const result = await getFinancialEventsForTickers(userId, userTickers, 8);
      holdingsNews = result.events;
    }
  } catch {
    // Non-fatal — merged payload still useful without news
  }

  return {
    accounts: mergedAccounts,
    activities: mergedActivities,
    activitiesByAccount: mergedActivitiesByAccount,
    balances: balancesResult.balances,
    balancesByAccount: balancesResult.balancesByAccount,
    holdingsNews,
    portfolioSnapshots: allPortfolioSnapshots,
    positions: mergedPositions,
    positionsByAccount: mergedPositionsByAccount,
    userBrokerages: mergedBrokerages,
  };
}
