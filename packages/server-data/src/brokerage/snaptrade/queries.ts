import { db } from "@cobalt-web/db";
import type { z } from "zod";

import { toDateString, toISOString } from "../lib.js";
import type { EnhancedBrokerageAccount } from "../plaid/lib.js";
import {
  accountDetailsFromDetailRows,
  balanceLineFromBalance,
  toIso,
} from "./lib.js";
import type {
  activitiesQuerySchema,
  portfolioSnapshotsQuerySchema,
  positionsQuerySchema,
} from "./schemas.js";

export type PositionsQuery = z.infer<typeof positionsQuerySchema>;
export type ActivitiesQuery = z.infer<typeof activitiesQuerySchema>;
export type PortfolioSnapshotsQuery = z.infer<
  typeof portfolioSnapshotsQuerySchema
>;

// ── Relational where types ──────────────────────────────────────────

type BalanceWhere = NonNullable<
  Parameters<typeof db.query.brokerageBalances.findMany>[0]
>["where"];

type PositionWhere = NonNullable<
  Parameters<typeof db.query.brokeragePositions.findMany>[0]
>["where"];

type ActivityWhere = NonNullable<
  Parameters<typeof db.query.brokerageActivities.findMany>[0]
>["where"];

type SnapshotWhere = NonNullable<
  Parameters<typeof db.query.portfolioSnapshots.findMany>[0]
>["where"];

// ── Helpers ─────────────────────────────────────────────────────────

/** Group an array of items by a key extracted from each item. */
const groupBy = <T>(
  items: T[],
  key: (item: T) => string
): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
};

// ── Balances (SnapTrade-synced `brokerage_*` tables) ─────────────────

export async function getBalancesByUserId(userId: string) {
  const whereParts: BalanceWhere[] = [
    { userId: { eq: userId } },
    {
      RAW: (t, { sql: sqlOp }) =>
        sqlOp`${t.lastSync} = (
          SELECT MAX(last_sync)
          FROM brokerage_balance bb2
          WHERE bb2.account_id = ${t.accountId}
          AND bb2.user_id = ${userId}
        )`,
    },
  ];

  const rows = await db.query.brokerageBalances.findMany({
    orderBy: { currencyCode: "asc" },
    where: { AND: whereParts } as BalanceWhere,
  });

  const balances = rows.map((r) => ({
    ...r,
    createdAt: toISOString(r.createdAt),
    lastSync: toISOString(r.lastSync),
    updatedAt: toISOString(r.updatedAt),
  }));

  return {
    balances,
    balancesByAccount: groupBy(balances, (b) => b.accountId),
  };
}

// ── Positions ───────────────────────────────────────────────────────

export async function getPositionsByUserId(
  userId: string,
  params: PositionsQuery
) {
  const { accountId, limit, offset } = params;

  const whereParts: PositionWhere[] = [
    { userId: { eq: userId } },
    {
      RAW: (t, { sql: sqlOp }) =>
        sqlOp`${t.lastSync} = (
          SELECT MAX(last_sync)
          FROM brokerage_position bp2
          WHERE bp2.account_id = ${t.accountId}
          AND bp2.user_id = ${userId}
        )`,
    },
  ];

  if (accountId) {
    whereParts.push({ accountId: { eq: accountId } });
  }

  const rawPositions = await db.query.brokeragePositions.findMany({
    limit,
    offset,
    orderBy: { symbol: "asc" },
    where: { AND: whereParts } as PositionWhere,
  });

  const positions = rawPositions.map((p) => ({
    ...p,
    createdAt: toISOString(p.createdAt),
    lastSync: toISOString(p.lastSync),
    updatedAt: toISOString(p.updatedAt),
  }));

  return {
    positions,
    positionsByAccount: groupBy(positions, (p) => p.accountId),
  };
}

// ── Activities ──────────────────────────────────────────────────────

export async function getActivitiesByUserId(
  userId: string,
  params: ActivitiesQuery
) {
  const { accountId, limit, offset } = params;

  const whereParts: ActivityWhere[] = [{ userId: { eq: userId } }];
  if (accountId) {
    whereParts.push({ accountId: { eq: accountId } });
  }

  const rawActivities = await db.query.brokerageActivities.findMany({
    limit,
    offset,
    orderBy: { tradeDate: "desc" },
    where: { AND: whereParts } as ActivityWhere,
  });

  const activities = rawActivities.map((a) => ({
    ...a,
    createdAt: toISOString(a.createdAt),
    lastSync: toISOString(a.lastSync),
    settlementDate: toDateString(a.settlementDate),
    tradeDate: toDateString(a.tradeDate),
    updatedAt: toISOString(a.updatedAt),
  }));

  return {
    activities,
    activitiesByAccount: groupBy(activities, (a) => a.accountId),
  };
}

// ── Portfolio Snapshots ─────────────────────────────────────────────

export async function getPortfolioSnapshotsByUserId(
  userId: string,
  params: PortfolioSnapshotsQuery
) {
  const {
    accountId,
    startDate: startDateParam,
    endDate: endDateParam,
  } = params;

  const whereParts: SnapshotWhere[] = [{ userId: { eq: userId } }];

  if (accountId && accountId !== "all-accounts") {
    whereParts.push({ accountId: { eq: accountId } });
  }

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const startDate =
    startDateParam ?? sixMonthsAgo.toISOString().split("T")[0] ?? "";
  const endDate = endDateParam ?? now.toISOString().split("T")[0] ?? "";

  whereParts.push({ snapshotDate: { gte: startDate } });
  whereParts.push({ snapshotDate: { lte: endDate } });

  const rows = await db.query.portfolioSnapshots.findMany({
    columns: {
      accountId: true,
      cashValue: true,
      positionsValue: true,
      snapshotDate: true,
      totalValue: true,
    },
    orderBy: { snapshotDate: "asc" },
    where: { AND: whereParts } as SnapshotWhere,
  });

  return rows
    .map((s) => {
      const dateStr = toDateString(s.snapshotDate);
      if (!dateStr) {
        return null;
      }
      return {
        accountId: s.accountId,
        cash: Number.parseFloat(s.cashValue?.toString() ?? "0"),
        positions: Number.parseFloat(s.positionsValue?.toString() ?? "0"),
        snapshotDate: dateStr,
        value: Number.parseFloat(s.totalValue?.toString() ?? "0"),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// ── User Brokerages ─────────────────────────────────────────────────

export async function getUserBrokeragesByUserId(userId: string) {
  const rows = await db.query.brokerageAccounts.findMany({
    columns: { institutionName: true },
    where: {
      institutionName: { isNotNull: true },
      userId: { eq: userId },
    },
  });

  const names = rows
    .map((r) => r.institutionName)
    .filter((n): n is string => typeof n === "string" && n !== "");
  return [...new Set(names)].toSorted((a, b) => a.localeCompare(b));
}

// ── User Tickers ────────────────────────────────────────────────────

export async function getUserTickersByUserId(userId: string) {
  const rows = await db.query.brokeragePositions.findMany({
    columns: { symbol: true },
    where: {
      symbol: { isNotNull: true },
      userId: { eq: userId },
    },
  });

  const symbols = rows
    .map((r) => r.symbol)
    .filter((s): s is string => typeof s === "string" && s !== "");
  return [...new Set(symbols)].toSorted((a, b) => a.localeCompare(b));
}

// ── SnapTrade-connected accounts (grouped balances) ─────────────────

/** SnapTrade-connected brokerage accounts (grouped balances), for API responses. */
export async function getSnaptradeBrokerageAccountsByUserId(
  userId: string
): Promise<EnhancedBrokerageAccount[]> {
  const row = await db.query.user.findFirst({
    where: { id: { eq: userId } },
    with: {
      brokerageAccounts: {
        orderBy: { createdAt: "asc" },
        with: {
          accountDetails: {
            orderBy: { id: "asc" },
          },
          balances: {
            orderBy: { currencyCode: "asc" },
          },
        },
      },
    },
  });

  const rows = row?.brokerageAccounts ?? [];

  return rows.map(
    (account): EnhancedBrokerageAccount => ({
      accountDetails: accountDetailsFromDetailRows(account.accountDetails),
      accountStatus: account.accountStatus ?? "",
      accountType: account.accountType ?? "",
      balanceData: account.balanceData,
      balances: account.balances.map(balanceLineFromBalance),
      cashRestrictions: account.cashRestrictions,
      createdDate: account.createdDate
        ? toIso(account.createdDate)
        : toIso(new Date()),
      id: account.id,
      institutionName: account.institutionName ?? "",
      name: account.name ?? "",
      portfolioGroup: account.portfolioGroup ?? null,
      userId: account.userId,
    })
  );
}
