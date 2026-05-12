import { db } from "@cobalt-web/db";
import type { z } from "zod";

import type { EnhancedBrokerageAccount } from "./lib.js";
import { toDateString, toISOString } from "./lib.js";
import type {
  activitiesQuerySchema,
  portfolioSnapshotsQuerySchema,
  positionsQuerySchema,
} from "./schemas.js";

export type PositionsQuery = z.infer<typeof positionsQuerySchema>;
export type ActivitiesQuery = z.infer<typeof activitiesQuerySchema>;
export type PortfolioSnapshotsQuery = z.infer<typeof portfolioSnapshotsQuerySchema>;

const groupBy = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
};

const numStr = (v: string | null | undefined): string | null =>
  v === null || v === undefined ? null : v;

// ── Plaid investment-activity type vocabulary normalization ─────────

const PLAID_SUBTYPE_LABEL: Record<string, string> = {
  "account fee": "FEE",
  contribution: "CONTRIBUTION",
  deposit: "CONTRIBUTION",
  dividend: "DIVIDEND",
  "dividend reinvestment": "DIVIDEND",
  "fund fee": "FEE",
  interest: "INTEREST",
  "interest receivable": "INTEREST",
  "interest reinvestment": "INTEREST",
  "legal fee": "FEE",
  "long-term capital gain": "CAPITAL_GAIN",
  "long-term capital gain reinvestment": "CAPITAL_GAIN",
  "management fee": "FEE",
  merger: "CORPORATE_ACTION",
  "miscellaneous fee": "FEE",
  "non-qualified dividend": "DIVIDEND",
  "non-resident tax": "TAX",
  "qualified dividend": "DIVIDEND",
  "short-term capital gain": "CAPITAL_GAIN",
  "short-term capital gain reinvestment": "CAPITAL_GAIN",
  "spin off": "CORPORATE_ACTION",
  split: "CORPORATE_ACTION",
  "stock distribution": "CORPORATE_ACTION",
  tax: "TAX",
  "tax withheld": "TAX",
  transfer: "TRANSFER",
  "transfer fee": "FEE",
  "trust fee": "FEE",
  withdrawal: "WITHDRAWAL",
};

const PLAID_TYPE_LABEL: Record<string, string> = {
  buy: "BUY",
  cancel: "CANCEL",
  cash: "CASH",
  fee: "FEE",
  sell: "SELL",
  transfer: "TRANSFER",
};

/** Plaid stores raw type/subtype strings; SnapTrade stores canonical labels.
 * Normalize Plaid rows on read so the wire vocabulary is consistent. */
function normalizeActivityType(source: string, type: string, subtype: string | null): string {
  if (source !== "plaid") {
    return type;
  }
  if (subtype) {
    const sub = PLAID_SUBTYPE_LABEL[subtype];
    if (sub !== undefined) {
      return sub;
    }
  }
  const t = PLAID_TYPE_LABEL[type];
  if (t !== undefined) {
    return t;
  }
  return type.toUpperCase();
}

// ── Balances ────────────────────────────────────────────────────────

export async function getBalancesByUserId(userId: string) {
  const rows = await db.query.balance.findMany({
    columns: {
      buyingPower: true,
      createdAt: true,
      currency: true,
      current: true,
      id: true,
      lastSyncAt: true,
      updatedAt: true,
    },
    orderBy: { currency: "asc" },
    where: { userId: { eq: userId } },
    with: {
      account: {
        columns: { externalId: true },
      },
    },
  });

  const balances = rows.map((r) => ({
    accountId: r.account.externalId ?? "",
    buyingPower: numStr(r.buyingPower),
    cash: numStr(r.current),
    createdAt: toISOString(r.createdAt),
    currencyCode: r.currency ?? "USD",
    currencyName: "US Dollar",
    id: r.id,
    lastSync: toISOString(r.lastSyncAt ?? r.updatedAt),
    snapTradeAccountId: r.account.externalId ?? "",
    updatedAt: toISOString(r.updatedAt),
    userId,
  }));

  return {
    balances,
    balancesByAccount: groupBy(balances, (b) => b.accountId),
  };
}

// ── Positions ───────────────────────────────────────────────────────

export async function getPositionsByUserId(userId: string, params: PositionsQuery) {
  const { accountId, limit, offset } = params;

  const rows = await db.query.holding.findMany({
    columns: {
      averagePrice: true,
      costBasis: true,
      createdAt: true,
      currency: true,
      id: true,
      institutionPrice: true,
      institutionValue: true,
      isQuotable: true,
      isTradable: true,
      lastSyncAt: true,
      openPnl: true,
      quantity: true,
      securityId: true,
      updatedAt: true,
    },
    ...(limit === undefined ? {} : { limit }),
    ...(offset === undefined ? {} : { offset }),
    where: {
      userId: { eq: userId },
      ...(accountId ? { account: { externalId: { eq: accountId } } } : {}),
    },
    with: {
      account: { columns: { externalId: true } },
      security: {
        columns: {
          exchangeCode: true,
          exchangeName: true,
          externalId: true,
          figiCode: true,
          marketIdentifierCode: true,
          name: true,
          subtype: true,
          tickerSymbol: true,
          type: true,
        },
      },
    },
  });

  // Sort by ticker client-side — drizzle relational findMany can't orderBy across joins.
  rows.sort((a, b) => (a.security.tickerSymbol ?? "").localeCompare(b.security.tickerSymbol ?? ""));

  const positions = rows.map((r) => {
    // Plaid rows lack averagePrice/openPnl — fall back to computed values.
    const quantity = Number(r.quantity ?? 0);
    const costBasisNum = Number(r.costBasis ?? 0);
    const institutionValueNum = Number(r.institutionValue ?? 0);
    const averagePurchasePrice =
      r.averagePrice ?? (quantity > 0 ? String(costBasisNum / quantity) : "0");
    const openPnl = r.openPnl ?? String(institutionValueNum - costBasisNum);

    const externalId = r.account.externalId ?? "";
    const sec = r.security;
    return {
      accountId: externalId,
      averagePurchasePrice: numStr(averagePurchasePrice),
      createdAt: toISOString(r.createdAt),
      currencyCode: r.currency ?? "USD",
      currencyId: null,
      currencyName: "US Dollar",
      exchangeCode: sec.exchangeCode,
      exchangeId: null,
      exchangeMicCode: sec.marketIdentifierCode,
      exchangeName: sec.exchangeName,
      figiCode: sec.figiCode,
      id: r.id,
      isQuotable: r.isQuotable ?? true,
      isTradable: r.isTradable ?? false,
      lastSync: toISOString(r.lastSyncAt ?? r.updatedAt),
      localId: null,
      openPnl: numStr(openPnl),
      price: numStr(r.institutionPrice),
      rawSymbol: sec.tickerSymbol,
      securityTypeCode: sec.type,
      securityTypeDescription: sec.subtype,
      securityTypeId: null,
      snapTradeAccountId: externalId,
      symbol: sec.tickerSymbol,
      symbolDescription: sec.name,
      symbolId: sec.externalId,
      units: numStr(r.quantity),
      updatedAt: toISOString(r.updatedAt),
      userId,
    };
  });

  return {
    positions,
    positionsByAccount: groupBy(positions, (p) => p.accountId),
  };
}

// ── Activities ──────────────────────────────────────────────────────

function fetchActivityRows(
  userId: string,
  accountId: string | undefined,
  opts: { limit?: number; offset?: number },
) {
  return db.query.investmentActivity.findMany({
    columns: {
      amount: true,
      createdAt: true,
      currency: true,
      date: true,
      externalId: true,
      externalReferenceId: true,
      fees: true,
      id: true,
      name: true,
      optionSymbol: true,
      optionType: true,
      price: true,
      quantity: true,
      settlementDate: true,
      source: true,
      subtype: true,
      type: true,
      updatedAt: true,
    },
    ...(opts.limit === undefined ? {} : { limit: opts.limit }),
    ...(opts.offset === undefined ? {} : { offset: opts.offset }),
    orderBy: { date: "desc" },
    where: {
      userId: { eq: userId },
      ...(accountId ? { account: { externalId: { eq: accountId } } } : {}),
    },
    with: {
      account: { columns: { externalId: true } },
      security: {
        columns: {
          exchangeCode: true,
          exchangeName: true,
          externalId: true,
          figiCode: true,
          marketIdentifierCode: true,
          name: true,
          subtype: true,
          tickerSymbol: true,
          type: true,
        },
      },
    },
  });
}

type ActivityRow = Awaited<ReturnType<typeof fetchActivityRows>>[number];

function pickSecurityFields(sec: ActivityRow["security"]) {
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

function mapActivityRow(r: ActivityRow, userId: string) {
  const sec = pickSecurityFields(r.security);
  const acctExternal = r.account.externalId ?? "";
  return {
    accountId: acctExternal,
    activityId: r.externalId,
    amount: numStr(r.amount),
    createdAt: toISOString(r.createdAt),
    currencyCode: r.currency ?? "USD",
    currencyId: null,
    currencyName: "US Dollar",
    description: r.name,
    exchangeCode: sec.exchangeCode,
    exchangeId: null,
    exchangeMicCode: sec.exchangeMicCode,
    exchangeName: sec.exchangeName,
    externalReferenceId: r.externalReferenceId,
    fee: numStr(r.fees),
    figiCode: sec.figiCode,
    fxRate: null,
    id: r.id,
    institution: null,
    lastSync: toISOString(r.updatedAt),
    optionSymbol: r.optionSymbol,
    optionType: r.optionType,
    pagination: null,
    price: numStr(r.price),
    rawSymbol: sec.ticker,
    securityTypeCode: sec.securityTypeCode,
    securityTypeDescription: sec.securityTypeDescription,
    securityTypeId: null,
    settlementDate: toDateString(r.settlementDate),
    snapTradeAccountId: acctExternal,
    symbol: sec.ticker,
    symbolDescription: sec.symbolDescription,
    symbolId: sec.symbolId,
    symbolTicker: sec.ticker,
    tradeDate: toDateString(r.date),
    type: normalizeActivityType(r.source, r.type, r.subtype),
    units: numStr(r.quantity),
    updatedAt: toISOString(r.updatedAt),
    userId,
  };
}

export async function getActivitiesByUserId(userId: string, params: ActivitiesQuery) {
  const { accountId, limit, offset } = params;
  const rows = await fetchActivityRows(userId, accountId, { limit, offset });
  const activities = rows.map((r) => mapActivityRow(r, userId));
  return {
    activities,
    activitiesByAccount: groupBy(activities, (a) => a.accountId),
  };
}

// ── Portfolio snapshots ─────────────────────────────────────────────

export async function getPortfolioSnapshotsByUserId(
  userId: string,
  params: PortfolioSnapshotsQuery,
) {
  const { accountId, startDate: startDateParam, endDate: endDateParam } = params;

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const startDate = startDateParam ?? sixMonthsAgo.toISOString().split("T")[0] ?? "";
  const endDate = endDateParam ?? now.toISOString().split("T")[0] ?? "";

  const rows = await db.query.snapshot.findMany({
    columns: {
      accountId: true,
      current: true,
      id: true,
      snapshotDate: true,
    },
    orderBy: { snapshotDate: "asc" },
    where: {
      account: {
        OR: [
          { source: { eq: "snaptrade" } },
          { AND: [{ source: { eq: "plaid" } }, { type: { eq: "investment" } }] },
        ],
      },
      snapshotDate: { gte: startDate, lte: endDate },
      userId: { eq: userId },
      ...(accountId && accountId !== "all-accounts" ? { accountId: { eq: accountId } } : {}),
    },
  });

  return rows
    .map((s) => {
      const dateStr = toDateString(s.snapshotDate);
      if (!dateStr) {
        return null;
      }
      return {
        accountId: s.accountId,
        id: s.id,
        snapshotDate: dateStr,
        value: Number.parseFloat(s.current ?? "0"),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// ── User brokerages (institution names across all sources) ──────────

export async function getUserBrokeragesByUserId(userId: string) {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      institutionName: true,
      source: true,
      type: true,
    },
    where: {
      OR: [
        { institutionName: { isNotNull: true } },
        { plaidConnection: { institutionName: { isNotNull: true } } },
      ],
      userId: { eq: userId },
    },
    with: {
      plaidConnection: {
        columns: { institutionName: true },
      },
    },
  });

  const names = rows
    .map((r) => {
      // Plaid: only investment accounts contribute to "user brokerages".
      if (r.source === "plaid" && r.type !== "investment") {
        return null;
      }
      return r.institutionName ?? r.plaidConnection?.institutionName ?? null;
    })
    .filter((n): n is string => typeof n === "string" && n !== "");
  return [...new Set(names)].toSorted((a, b) => a.localeCompare(b));
}

// ── User tickers ────────────────────────────────────────────────────

export async function getUserTickersByUserId(userId: string) {
  const rows = await db.query.holding.findMany({
    columns: {},
    where: {
      security: { tickerSymbol: { isNotNull: true } },
      userId: { eq: userId },
    },
    with: {
      security: { columns: { tickerSymbol: true } },
    },
  });

  const symbols = rows
    .map((r) => r.security.tickerSymbol)
    .filter((s): s is string => typeof s === "string" && s !== "");
  return [...new Set(symbols)].toSorted((a, b) => a.localeCompare(b));
}

// ── Brokerage accounts (SnapTrade + Plaid investment accounts) ──────

/**
 * All brokerage-shaped accounts for a user — SnapTrade-connected accounts and
 * Plaid investment accounts — keyed on `financialAccount.externalId`.
 * Institution name is COALESCEd from `plaidConnection` for Plaid rows.
 */
export async function getBrokerageAccountsByUserId(
  userId: string,
): Promise<EnhancedBrokerageAccount[]> {
  const accounts = await db.query.financialAccount.findMany({
    columns: {
      createdAt: true,
      externalId: true,
      id: true,
      institutionName: true,
      name: true,
      status: true,
      subtype: true,
      type: true,
    },
    orderBy: { createdAt: "asc" },
    where: {
      OR: [
        { source: { eq: "snaptrade" } },
        { source: { eq: "plaid" }, type: { eq: "investment" } },
      ],
      userId: { eq: userId },
    },
    with: {
      balance: {
        columns: {
          buyingPower: true,
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
    },
  });

  if (accounts.length === 0) {
    return [];
  }

  return accounts.map((account): EnhancedBrokerageAccount => {
    const b = account.balance;
    return {
      accountDetails: null,
      accountStatus: account.status ?? "",
      accountType: account.subtype ?? account.type ?? "",
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
      createdDate: account.createdAt.toISOString(),
      id: account.externalId ?? account.id,
      institutionName: account.institutionName ?? account.plaidConnection?.institutionName ?? "",
      name: account.name ?? "",
      userId,
    };
  });
}
