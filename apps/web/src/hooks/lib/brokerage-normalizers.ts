import type { queries, Row, Snapshot } from "@cobalt-web/zero";

import type { PortfolioSnapshotRow } from "@/components/brokerage/balance-chart-card";
import type { PositionRow } from "@/components/brokerage/positions-table";
import type { ActivityRow } from "@/components/brokerage/recent-activity-card";

export type RawHolding = Row<typeof queries.brokerage.positions>;
export type RawInvestmentActivity = Row<typeof queries.brokerage.recentActivities>;

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
    currencyCode: h.currency ?? null,
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

export function snapshotToRow(s: Snapshot): PortfolioSnapshotRow {
  return {
    accountId: s.accountId,
    id: s.id,
    snapshotDate: s.snapshotDate,
    totalValue: s.current ?? null,
  };
}
