import type { Ticker } from "@cobalt-web/db/schema/research/tickers";

// ── DTO types ─────────────────────────────────────────────────────

export interface TickerSearchItem {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  active: boolean;
}

// ── Transformers ──────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "Common Stock": "Equity",
  "Depositary Receipt": "ADR",
  ETF: "ETF",
  "Preferred Stock": "Preferred Stock",
  Right: "Rights",
  Unit: "Unit",
  Warrant: "Warrant",
};

export function dbTickerToSearchItem(row: Ticker): TickerSearchItem {
  return {
    active: row.isActive,
    currency: row.currency ?? "",
    name: row.name,
    region: row.country ?? "",
    symbol: row.symbol,
    type: TYPE_LABELS[row.type] ?? row.type,
  };
}
