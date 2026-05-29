import { db } from "@cobalt-web/db";

import type { MappedFinancialEvent } from "../../news/events/schemas.js";
import { getEventsForTickers, getHoldingsTickers } from "../../news/for-you/queries.js";
import { toISOString } from "../_shared/lib.js";
import type { EnhancedBrokerageAccount } from "../_shared/schema.js";
import { getActivities } from "../activities/query.js";
import type { ActivityItem } from "../activities/schema.js";
import type { BalanceItem } from "../balances/schema.js";
import { getPortfolioSnapshots } from "../portfolio-snapshots/query.js";
import type { PortfolioSnapshotItem } from "../portfolio-snapshots/schema.js";
import { getPositions } from "../positions/query.js";
import type { PositionItem } from "../positions/schema.js";

export interface BrokerageOverviewOptions {
  activitiesLimit?: number;
  endDate?: string;
  positionsLimit?: number;
  startDate?: string;
}

export interface BrokerageOverview {
  accounts: EnhancedBrokerageAccount[];
  activities: ActivityItem[];
  activitiesByAccount: Record<string, ActivityItem[]>;
  balances: BalanceItem[];
  balancesByAccount: Record<string, BalanceItem[]>;
  holdingsNews: MappedFinancialEvent[];
  portfolioSnapshots: PortfolioSnapshotItem[];
  positions: PositionItem[];
  positionsByAccount: Record<string, PositionItem[]>;
  userBrokerages: string[];
}

const groupBy = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
};

/**
 * Brokerage data (SnapTrade + Plaid investment accounts, unified) in one
 * payload. One DB call covers accounts + balances + userBrokerages; positions,
 * activities, snapshots, and holdings-news fan out in parallel.
 */
export async function getBrokerageOverview(
  userId: string,
  options: BrokerageOverviewOptions = {},
): Promise<BrokerageOverview> {
  const { startDate, endDate, positionsLimit = 50, activitiesLimit = 25 } = options;

  const [accountRows, tickers, portfolioSnapshots, positionsResult, activitiesResult] =
    await Promise.all([
      fetchAccountsWithBalances(userId),
      getHoldingsTickers(userId),
      getPortfolioSnapshots(userId, { endDate, startDate }),
      getPositions(userId, { limit: positionsLimit }),
      getActivities(userId, { limit: activitiesLimit }),
    ]);

  const accounts = accountRows.map((r) => toEnhancedAccount(r, userId));
  const balances = accountRows.flatMap((r) => toBalanceItems(r, userId));
  const userBrokerages = deriveUserBrokerages(accountRows);

  let holdingsNews: MappedFinancialEvent[] = [];
  try {
    if (tickers.length > 0) {
      const result = await getEventsForTickers(userId, tickers, 8);
      holdingsNews = result.events;
    }
  } catch {
    // Non-fatal — payload still useful without news
  }

  return {
    accounts,
    activities: activitiesResult.activities,
    activitiesByAccount: activitiesResult.activitiesByAccount,
    balances,
    balancesByAccount: groupBy(balances, (b) => b.accountId),
    holdingsNews,
    portfolioSnapshots,
    positions: positionsResult.positions,
    positionsByAccount: positionsResult.positionsByAccount,
    userBrokerages,
  };
}

type AccountRow = Awaited<ReturnType<typeof fetchAccountsWithBalances>>[number];

function fetchAccountsWithBalances(userId: string) {
  return db.query.financialAccount.findMany({
    columns: {
      createdAt: true,
      externalId: true,
      id: true,
      institutionName: true,
      name: true,
      source: true,
      status: true,
      subtype: true,
      type: true,
    },
    orderBy: { createdAt: "asc" },
    where: {
      OR: [
        { source: { eq: "snaptrade" } },
        { source: { eq: "plaid" }, type: { eq: "investment" } },
        { source: { eq: "manual" }, type: { eq: "investment" } },
      ],
      userId: { eq: userId },
    },
    with: {
      balance: {
        columns: {
          buyingPower: true,
          createdAt: true,
          currency: true,
          current: true,
          id: true,
          lastSyncAt: true,
          updatedAt: true,
        },
      },
      plaidConnection: {
        columns: { institutionName: true },
      },
      snaptradeAuthorization: {
        columns: { authorizationId: true, isDisabled: true },
      },
    },
  });
}

function toEnhancedAccount(row: AccountRow, userId: string): EnhancedBrokerageAccount {
  const b = row.balance;
  return {
    accountDetails: null,
    accountStatus: row.status ?? "",
    accountType: row.subtype ?? row.type ?? "",
    balanceData: null,
    balances: b
      ? [
          {
            buyingPower: b.buyingPower,
            cash: b.current,
            currencyCode: b.currency ?? "USD",
            currencyName: "US Dollar",
            id: b.id,
            lastSync: (b.lastSyncAt ?? b.updatedAt).toISOString(),
          },
        ]
      : [],
    cashRestrictions: null,
    createdDate: row.createdAt.toISOString(),
    id: row.externalId ?? row.id,
    institutionName: row.institutionName ?? row.plaidConnection?.institutionName ?? "",
    name: row.name ?? "",
    needsReauth: row.snaptradeAuthorization?.isDisabled ?? false,
    snaptradeAuthorizationId: row.snaptradeAuthorization?.authorizationId ?? null,
    userId,
  };
}

function toBalanceItems(row: AccountRow, userId: string): BalanceItem[] {
  const b = row.balance;
  if (!b) {
    return [];
  }
  const accountId = row.externalId ?? "";
  return [
    {
      accountId,
      buyingPower: b.buyingPower,
      cash: b.current,
      createdAt: toISOString(b.createdAt),
      currencyCode: b.currency ?? "USD",
      currencyName: "US Dollar",
      id: b.id,
      lastSync: toISOString(b.lastSyncAt ?? b.updatedAt),
      snapTradeAccountId: accountId,
      updatedAt: toISOString(b.updatedAt),
      userId,
    },
  ];
}

function deriveUserBrokerages(rows: AccountRow[]): string[] {
  const names = rows
    .map((r) => {
      if ((r.source === "plaid" || r.source === "manual") && r.type !== "investment") {
        return null;
      }
      return r.institutionName ?? r.plaidConnection?.institutionName ?? null;
    })
    .filter((n): n is string => typeof n === "string" && n !== "");
  return [...new Set(names)].toSorted((a, b) => a.localeCompare(b));
}
