import type { MappedFinancialEvent } from "../news/events/schemas.js";
import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "../news/for-you/queries.js";
import type {
  EnhancedBrokerageAccount,
  MergedBrokerageActivity,
  MergedBrokeragePosition,
} from "./lib.js";
import {
  getActivitiesByUserId,
  getBalancesByUserId,
  getBrokerageAccountsByUserId,
  getPortfolioSnapshotsByUserId,
  getPositionsByUserId,
  getUserBrokeragesByUserId,
} from "./queries.js";

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
 * Brokerage data (SnapTrade + Plaid investment accounts, unified) in one
 * payload, matching the legacy merged brokerage API.
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
    accounts,
    balancesResult,
    userBrokerages,
    userTickers,
    portfolioSnapshots,
    positionsResult,
    activitiesResult,
  ] = await Promise.all([
    getBrokerageAccountsByUserId(userId),
    getBalancesByUserId(userId),
    getUserBrokeragesByUserId(userId),
    getUserStockTickers(userId),
    getPortfolioSnapshotsByUserId(userId, { endDate, startDate }),
    getPositionsByUserId(userId, { limit: positionsLimit }),
    getActivitiesByUserId(userId, { limit: activitiesLimit }),
  ]);

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
    accounts,
    activities: activitiesResult.activities,
    activitiesByAccount: activitiesResult.activitiesByAccount,
    balances: balancesResult.balances,
    balancesByAccount: balancesResult.balancesByAccount,
    holdingsNews,
    portfolioSnapshots,
    positions: positionsResult.positions,
    positionsByAccount: positionsResult.positionsByAccount,
    userBrokerages,
  };
}
