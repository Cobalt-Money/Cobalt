import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { financialAccount } from "@cobalt-web/db/schema/accounts/financial-account";
import { holding } from "@cobalt-web/db/schema/accounts/holding";
import { investmentActivity } from "@cobalt-web/db/schema/accounts/investment-activity";
import { security } from "@cobalt-web/db/schema/accounts/security";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import type { z } from "zod";

import { toDateString, toISOString } from "../lib.js";
import type { EnhancedBrokerageAccount } from "../plaid/lib.js";
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

const numStr = (v: string | null | undefined): string | null =>
  v === null || v === undefined ? null : v;

// ── Balances ────────────────────────────────────────────────────────

export async function getBalancesByUserId(userId: string) {
  const rows = await db
    .select({
      accountExternalId: financialAccount.externalId,
      bal: {
        available: balance.available,
        buyingPower: balance.buyingPower,
        createdAt: balance.createdAt,
        current: balance.current,
        id: balance.id,
        isoCurrencyCode: balance.isoCurrencyCode,
        lastSyncAt: balance.lastSyncAt,
        updatedAt: balance.updatedAt,
      },
    })
    .from(balance)
    .innerJoin(financialAccount, eq(balance.accountId, financialAccount.id))
    .where(
      and(eq(balance.userId, userId), eq(financialAccount.source, "snaptrade"))
    )
    .orderBy(asc(balance.isoCurrencyCode));

  const balances = rows.map((r) => ({
    accountId: r.accountExternalId ?? "",
    buyingPower: numStr(r.bal.buyingPower),
    cash: numStr(r.bal.current),
    createdAt: toISOString(r.bal.createdAt),
    currencyCode: r.bal.isoCurrencyCode ?? "USD",
    currencyName: "US Dollar",
    id: r.bal.id,
    lastSync: toISOString(r.bal.lastSyncAt ?? r.bal.updatedAt),
    snapTradeAccountId: r.accountExternalId ?? "",
    updatedAt: toISOString(r.bal.updatedAt),
    userId,
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

  const conditions = [
    eq(holding.userId, userId),
    eq(financialAccount.source, "snaptrade"),
  ];
  if (accountId) {
    conditions.push(eq(financialAccount.externalId, accountId));
  }

  let q = db
    .select({
      acct: { externalId: financialAccount.externalId },
      hold: {
        averagePrice: holding.averagePrice,
        costBasis: holding.costBasis,
        createdAt: holding.createdAt,
        id: holding.id,
        institutionPrice: holding.institutionPrice,
        institutionValue: holding.institutionValue,
        isQuotable: holding.isQuotable,
        isTradable: holding.isTradable,
        isoCurrencyCode: holding.isoCurrencyCode,
        lastSyncAt: holding.lastSyncAt,
        openPnl: holding.openPnl,
        quantity: holding.quantity,
        securityId: holding.securityId,
        updatedAt: holding.updatedAt,
      },
      sec: {
        exchangeCode: security.exchangeCode,
        exchangeName: security.exchangeName,
        externalId: security.externalId,
        figiCode: security.figiCode,
        marketIdentifierCode: security.marketIdentifierCode,
        name: security.name,
        subtype: security.subtype,
        tickerSymbol: security.tickerSymbol,
        type: security.type,
      },
    })
    .from(holding)
    .innerJoin(financialAccount, eq(holding.accountId, financialAccount.id))
    .innerJoin(security, eq(holding.securityId, security.id))
    .where(and(...conditions))
    .orderBy(asc(security.tickerSymbol))
    .$dynamic();

  if (limit !== undefined) {
    q = q.limit(limit);
  }
  if (offset !== undefined) {
    q = q.offset(offset);
  }

  const rows = await q;

  const positions = rows.map((r) => ({
    accountId: r.acct.externalId ?? "",
    averagePurchasePrice: numStr(r.hold.averagePrice),
    createdAt: toISOString(r.hold.createdAt),
    currencyCode: r.hold.isoCurrencyCode ?? "USD",
    currencyId: null,
    currencyName: "US Dollar",
    exchangeCode: r.sec.exchangeCode,
    exchangeId: null,
    exchangeMicCode: r.sec.marketIdentifierCode,
    exchangeName: r.sec.exchangeName,
    figiCode: r.sec.figiCode,
    id: r.hold.id,
    isQuotable: r.hold.isQuotable ?? true,
    isTradable: r.hold.isTradable ?? false,
    lastSync: toISOString(r.hold.lastSyncAt ?? r.hold.updatedAt),
    localId: null,
    openPnl: numStr(r.hold.openPnl),
    price: numStr(r.hold.institutionPrice),
    rawSymbol: r.sec.tickerSymbol,
    securityTypeCode: r.sec.type,
    securityTypeDescription: r.sec.subtype,
    securityTypeId: null,
    snapTradeAccountId: r.acct.externalId ?? "",
    symbol: r.sec.tickerSymbol,
    symbolDescription: r.sec.name,
    symbolId: r.sec.externalId,
    units: numStr(r.hold.quantity),
    updatedAt: toISOString(r.hold.updatedAt),
    userId,
  }));

  return {
    positions,
    positionsByAccount: groupBy(positions, (p) => p.accountId),
  };
}

// ── Activities ──────────────────────────────────────────────────────

interface ActivityJoinRow {
  acct: { externalId: string | null };
  activity: {
    amount: string | null;
    createdAt: Date | null;
    date: string | null;
    externalId: string | null;
    externalReferenceId: string | null;
    fees: string | null;
    id: string;
    isoCurrencyCode: string | null;
    name: string | null;
    optionSymbol: string | null;
    optionType: string | null;
    price: string | null;
    quantity: string | null;
    settlementDate: string | null;
    type: string | null;
    updatedAt: Date | null;
  };
  sec: {
    exchangeCode: string | null;
    exchangeName: string | null;
    externalId: string | null;
    figiCode: string | null;
    marketIdentifierCode: string | null;
    name: string | null;
    subtype: string | null;
    tickerSymbol: string | null;
    type: string | null;
  } | null;
}

function pickSecurityFields(sec: ActivityJoinRow["sec"]) {
  return {
    exchangeCode: sec?.exchangeCode ?? null,
    exchangeMicCode: sec?.marketIdentifierCode ?? null,
    exchangeName: sec?.exchangeName ?? null,
    figiCode: sec?.figiCode ?? null,
    securityTypeCode: sec?.type ?? null,
    securityTypeDescription: sec?.subtype ?? null,
    symbolDescription: sec?.name ?? null,
    symbolId: sec?.externalId ?? null,
    ticker: sec?.tickerSymbol ?? null,
  };
}

function mapActivityRow(r: ActivityJoinRow, userId: string) {
  const sec = pickSecurityFields(r.sec);
  const acctExternal = r.acct.externalId ?? "";
  return {
    accountId: acctExternal,
    activityId: r.activity.externalId,
    amount: numStr(r.activity.amount),
    createdAt: toISOString(r.activity.createdAt),
    currencyCode: r.activity.isoCurrencyCode ?? "USD",
    currencyId: null,
    currencyName: "US Dollar",
    description: r.activity.name,
    exchangeCode: sec.exchangeCode,
    exchangeId: null,
    exchangeMicCode: sec.exchangeMicCode,
    exchangeName: sec.exchangeName,
    externalReferenceId: r.activity.externalReferenceId,
    fee: numStr(r.activity.fees),
    figiCode: sec.figiCode,
    fxRate: null,
    id: r.activity.id,
    institution: null,
    lastSync: toISOString(r.activity.updatedAt),
    optionSymbol: r.activity.optionSymbol,
    optionType: r.activity.optionType,
    pagination: null,
    price: numStr(r.activity.price),
    rawSymbol: sec.ticker,
    securityTypeCode: sec.securityTypeCode,
    securityTypeDescription: sec.securityTypeDescription,
    securityTypeId: null,
    settlementDate: toDateString(r.activity.settlementDate),
    snapTradeAccountId: acctExternal,
    symbol: sec.ticker,
    symbolDescription: sec.symbolDescription,
    symbolId: sec.symbolId,
    symbolTicker: sec.ticker,
    tradeDate: toDateString(r.activity.date),
    type: r.activity.type,
    units: numStr(r.activity.quantity),
    updatedAt: toISOString(r.activity.updatedAt),
    userId,
  };
}

export async function getActivitiesByUserId(
  userId: string,
  params: ActivitiesQuery
) {
  const { accountId, limit, offset } = params;

  const conditions = [
    eq(investmentActivity.userId, userId),
    eq(financialAccount.source, "snaptrade"),
  ];
  if (accountId) {
    conditions.push(eq(financialAccount.externalId, accountId));
  }

  let q = db
    .select({
      acct: { externalId: financialAccount.externalId },
      activity: {
        amount: investmentActivity.amount,
        createdAt: investmentActivity.createdAt,
        date: investmentActivity.date,
        externalId: investmentActivity.externalId,
        externalReferenceId: investmentActivity.externalReferenceId,
        fees: investmentActivity.fees,
        id: investmentActivity.id,
        isoCurrencyCode: investmentActivity.isoCurrencyCode,
        name: investmentActivity.name,
        optionSymbol: investmentActivity.optionSymbol,
        optionType: investmentActivity.optionType,
        price: investmentActivity.price,
        quantity: investmentActivity.quantity,
        settlementDate: investmentActivity.settlementDate,
        type: investmentActivity.type,
        updatedAt: investmentActivity.updatedAt,
      },
      sec: {
        exchangeCode: security.exchangeCode,
        exchangeName: security.exchangeName,
        externalId: security.externalId,
        figiCode: security.figiCode,
        marketIdentifierCode: security.marketIdentifierCode,
        name: security.name,
        subtype: security.subtype,
        tickerSymbol: security.tickerSymbol,
        type: security.type,
      },
    })
    .from(investmentActivity)
    .innerJoin(
      financialAccount,
      eq(investmentActivity.accountId, financialAccount.id)
    )
    .leftJoin(security, eq(investmentActivity.securityId, security.id))
    .where(and(...conditions))
    .orderBy(desc(investmentActivity.date))
    .$dynamic();

  if (limit !== undefined) {
    q = q.limit(limit);
  }
  if (offset !== undefined) {
    q = q.offset(offset);
  }

  const rows = await q;

  const activities = rows.map((r) => mapActivityRow(r, userId));

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

  const conditions = [
    eq(snapshot.userId, userId),
    eq(financialAccount.source, "snaptrade"),
  ];

  if (accountId && accountId !== "all-accounts") {
    // accountId here is the internal financialAccount uuid (matches old portfolio_snapshot semantics).
    conditions.push(eq(snapshot.accountId, accountId));
  }

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const startDate =
    startDateParam ?? sixMonthsAgo.toISOString().split("T")[0] ?? "";
  const endDate = endDateParam ?? now.toISOString().split("T")[0] ?? "";

  conditions.push(gte(snapshot.snapshotDate, startDate));
  conditions.push(lte(snapshot.snapshotDate, endDate));

  const rows = await db
    .select({
      accountId: snapshot.accountId,
      current: snapshot.current,
      positionsValue: snapshot.positionsValue,
      snapshotDate: snapshot.snapshotDate,
    })
    .from(snapshot)
    .innerJoin(financialAccount, eq(snapshot.accountId, financialAccount.id))
    .where(and(...conditions))
    .orderBy(asc(snapshot.snapshotDate));

  return rows
    .map((s) => {
      const dateStr = toDateString(s.snapshotDate);
      if (!dateStr) {
        return null;
      }
      const total = Number.parseFloat(s.current ?? "0");
      const positions = Number.parseFloat(s.positionsValue ?? "0");
      const cash = total - positions;
      return {
        accountId: s.accountId,
        cash,
        positions,
        snapshotDate: dateStr,
        value: total,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// ── User Brokerages ─────────────────────────────────────────────────

export async function getUserBrokeragesByUserId(userId: string) {
  const rows = await db
    .select({ institutionName: financialAccount.institutionName })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.userId, userId),
        eq(financialAccount.source, "snaptrade"),
        isNotNull(financialAccount.institutionName)
      )
    );

  const names = rows
    .map((r) => r.institutionName)
    .filter((n): n is string => typeof n === "string" && n !== "");
  return [...new Set(names)].toSorted((a, b) => a.localeCompare(b));
}

// ── User Tickers ────────────────────────────────────────────────────

export async function getUserTickersByUserId(userId: string) {
  const rows = await db
    .selectDistinct({ ticker: security.tickerSymbol })
    .from(holding)
    .innerJoin(security, eq(holding.securityId, security.id))
    .innerJoin(financialAccount, eq(holding.accountId, financialAccount.id))
    .where(
      and(
        eq(holding.userId, userId),
        eq(financialAccount.source, "snaptrade"),
        isNotNull(security.tickerSymbol)
      )
    );

  const symbols = rows
    .map((r) => r.ticker)
    .filter((s): s is string => typeof s === "string" && s !== "");
  return [...new Set(symbols)].toSorted((a, b) => a.localeCompare(b));
}

// ── SnapTrade-connected accounts (grouped balances) ─────────────────

/**
 * SnapTrade-connected brokerage accounts (with grouped balances) for API responses.
 * `accountDetails` is now always null (brokerage_account_detail dropped per D1).
 */
export async function getSnaptradeBrokerageAccountsByUserId(
  userId: string
): Promise<EnhancedBrokerageAccount[]> {
  const accounts = await db
    .select({
      createdAt: financialAccount.createdAt,
      externalId: financialAccount.externalId,
      id: financialAccount.id,
      institutionName: financialAccount.institutionName,
      name: financialAccount.name,
      portfolioGroup: financialAccount.portfolioGroup,
      status: financialAccount.status,
      subtype: financialAccount.subtype,
      type: financialAccount.type,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.userId, userId),
        eq(financialAccount.source, "snaptrade")
      )
    )
    .orderBy(asc(financialAccount.createdAt));

  if (accounts.length === 0) {
    return [];
  }

  const accountIds = accounts.map((a) => a.id);
  const balances = await db
    .select({
      accountId: balance.accountId,
      buyingPower: balance.buyingPower,
      current: balance.current,
      id: balance.id,
      isoCurrencyCode: balance.isoCurrencyCode,
      lastSyncAt: balance.lastSyncAt,
      updatedAt: balance.updatedAt,
    })
    .from(balance)
    .where(inArray(balance.accountId, accountIds));

  const balancesByAccount = new Map<string, typeof balances>();
  for (const b of balances) {
    const list = balancesByAccount.get(b.accountId) ?? [];
    list.push(b);
    balancesByAccount.set(b.accountId, list);
  }

  return accounts.map((account): EnhancedBrokerageAccount => {
    const accountBalances = balancesByAccount.get(account.id) ?? [];
    return {
      accountDetails: null,
      accountStatus: account.status ?? "",
      accountType: account.subtype ?? account.type ?? "",
      balanceData: null,
      balances: accountBalances.map((b) => ({
        buyingPower: b.buyingPower,
        cash: b.current,
        currencyCode: b.isoCurrencyCode ?? "USD",
        currencyName: "US Dollar",
        id: b.id,
        lastSync: (b.lastSyncAt ?? b.updatedAt).toISOString(),
      })),
      cashRestrictions: null,
      createdDate: account.createdAt.toISOString(),
      id: account.externalId ?? account.id,
      institutionName: account.institutionName ?? "",
      name: account.name ?? "",
      portfolioGroup: account.portfolioGroup ?? null,
      userId,
    };
  });
}
