import type { TwelveDataTicker } from "@cobalt-web/clients/twelve-data";

// ── DTO types ─────────────────────────────────────────────────────

export interface TickerSearchItem {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  active: boolean;
}

export interface TickerPrice {
  symbol: string;
  price: number;
  timestamp: string;
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

export function toTickerSearchItem(ticker: TwelveDataTicker): TickerSearchItem {
  return {
    active: true,
    currency: ticker.currency,
    name: ticker.name,
    region: ticker.country,
    symbol: ticker.symbol,
    type: TYPE_LABELS[ticker.type] ?? ticker.type,
  };
}

// ── Alpha Vantage quote helpers ───────────────────────────────────

interface AlphaVantageQuoteFields {
  "05. price": string;
}

interface QuoteResponse {
  "Global Quote"?: AlphaVantageQuoteFields;
  "Global Quote - DATA DELAYED BY 15 MINUTES"?: AlphaVantageQuoteFields;
}

export function extractPrice(raw: unknown): number | null {
  const response = raw as QuoteResponse;
  const quoteData =
    response["Global Quote"] ??
    response["Global Quote - DATA DELAYED BY 15 MINUTES"];

  if (!quoteData) {
    return null;
  }

  const price = Number.parseFloat(quoteData["05. price"]);
  return Number.isNaN(price) ? null : price;
}
