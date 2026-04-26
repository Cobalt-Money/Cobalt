import type { PortfolioSnapshotRow } from "@/components/brokerage/balance-chart-card";
import type { PositionRow } from "@/components/brokerage/positions-table";
import type { ActivityRow } from "@/components/brokerage/recent-activity-card";

/** Holding row as returned by the unified zero `holding` query. */
export interface RawHolding {
  id: string;
  accountId: string;
  source: "snaptrade" | "plaid";
  quantity: number;
  averagePrice?: number | null;
  costBasis?: number | null;
  institutionPrice?: number | null;
  institutionValue?: number | null;
  openPnl?: number | null;
  isoCurrencyCode?: string | null;
  lastSyncAt?: number | null;
  account?: { id?: string; name?: string | null } | null;
  security?: { tickerSymbol?: string | null; name?: string | null } | null;
}

/** Investment activity row as returned by the unified zero `investmentActivity` query. */
export interface RawInvestmentActivity {
  id: string;
  accountId: string;
  source: "snaptrade" | "plaid";
  type: string;
  subtype?: string | null;
  amount: number;
  price?: number | null;
  date: string | number;
  account?: { name?: string | null } | null;
  security?: { tickerSymbol?: string | null; name?: string | null } | null;
}

/** Snapshot row covering both source values. */
export interface RawSnapshot {
  id: string;
  accountId: string;
  snapshotDate: number;
  totalValue?: number | null;
}

/**
 * Normalize a Holding row to the shape the positions table renders. Handles
 * both Plaid (sets costBasis + institutionValue) and SnapTrade (sets
 * averagePrice + openPnl) field conventions.
 */
export function holdingToPositionRow(h: RawHolding): PositionRow {
  const avgFromCostBasis =
    h.costBasis !== undefined && h.costBasis !== null && h.quantity > 0
      ? h.costBasis / h.quantity
      : null;
  const computedOpenPnl =
    h.openPnl ??
    (h.institutionValue !== undefined &&
    h.institutionValue !== null &&
    h.costBasis !== undefined &&
    h.costBasis !== null
      ? h.institutionValue - h.costBasis
      : null);

  return {
    accountId: h.accountId,
    averagePurchasePrice: h.averagePrice ?? avgFromCostBasis,
    brokerageAccount: { id: h.accountId, name: h.account?.name ?? null },
    currencyCode: h.isoCurrencyCode ?? null,
    id: h.id,
    institutionValue: h.institutionValue ?? null,
    openPnl: computedOpenPnl,
    price: h.institutionPrice ?? null,
    quantity: h.quantity,
    symbol: h.security?.tickerSymbol ?? null,
    symbolDescription: h.security?.name ?? null,
    units: h.quantity,
  };
}

/** Normalize an investmentActivity row to the recent-activity table shape. */
export function activityToActivityRow(a: RawInvestmentActivity): ActivityRow {
  let tradeDate: number | null = null;
  if (typeof a.date === "number") {
    tradeDate = a.date;
  } else if (a.date) {
    tradeDate = new Date(a.date).getTime();
  }
  return {
    amount: a.amount,
    brokerageAccount: { id: a.accountId, name: a.account?.name ?? null },
    id: a.id,
    price: a.price ?? null,
    symbolDescription: a.security?.name ?? null,
    symbolTicker: a.security?.tickerSymbol ?? null,
    tradeDate,
    type: a.subtype || a.type,
  };
}

export function snapshotToRow(s: RawSnapshot): PortfolioSnapshotRow {
  return {
    accountId: s.accountId,
    id: s.id,
    snapshotDate: s.snapshotDate,
    totalValue: s.totalValue ?? null,
  };
}
