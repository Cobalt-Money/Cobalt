import { alphaVantageRequest } from "@cobalt-web/clients/alpha-vantage";
import { stockNewsRequest } from "@cobalt-web/clients/stock-news";
import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";

import type { AlphaVantageQuoteResponse } from "./lib.js";
import { normalizeTickerForAlphaVantage } from "./lib.js";

// ── Quote ──────────────────────────────────────────────────────────

export function getQuoteData(symbol: string) {
  return alphaVantageRequest({
    function: "GLOBAL_QUOTE",
    symbol: normalizeTickerForAlphaVantage(symbol),
  }) as Promise<AlphaVantageQuoteResponse>;
}

// ── Company overview ───────────────────────────────────────────────

export function getCompanyOverview(symbol: string) {
  return alphaVantageRequest({
    function: "OVERVIEW",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });
}

// ── Time series (daily) ────────────────────────────────────────────

export function getTimeSeriesData(params: {
  symbol: string;
  interval?: "daily" | "weekly" | "monthly";
  outputsize?: "compact" | "full";
}) {
  const interval = params.interval ?? "daily";
  const outputsize = params.outputsize ?? "compact";
  const functionMap = {
    daily: "TIME_SERIES_DAILY",
    monthly: "TIME_SERIES_MONTHLY",
    weekly: "TIME_SERIES_WEEKLY",
  } as const;

  return alphaVantageRequest({
    function: functionMap[interval],
    outputsize,
    symbol: normalizeTickerForAlphaVantage(params.symbol),
  });
}

// ── Intraday ───────────────────────────────────────────────────────

export function getIntradayData(params: {
  symbol: string;
  interval: "1min" | "5min" | "15min" | "30min" | "60min";
  extended_hours?: boolean;
  outputsize?: "compact" | "full";
}) {
  return alphaVantageRequest({
    extended_hours: (params.extended_hours ?? false).toString(),
    function: "TIME_SERIES_INTRADAY",
    interval: params.interval,
    outputsize: params.outputsize ?? "compact",
    symbol: normalizeTickerForAlphaVantage(params.symbol),
  });
}

// ── Earnings ───────────────────────────────────────────────────────

export function getEarningsHistory(symbol: string) {
  return alphaVantageRequest({
    function: "EARNINGS",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });
}

export function getEarningsEstimates(symbol: string) {
  return alphaVantageRequest({
    function: "EARNINGS_ESTIMATES",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });
}

// ── Financials ─────────────────────────────────────────────────────

export function getIncomeStatement(symbol: string) {
  return alphaVantageRequest({
    function: "INCOME_STATEMENT",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });
}

export function getBalanceSheet(symbol: string) {
  return alphaVantageRequest({
    function: "BALANCE_SHEET",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });
}

// ── Research news ──────────────────────────────────────────────────

interface StockNewsTickerArticlesResponse {
  data: StockNewsArticle[];
  total_pages: number;
  total_items: number;
}

export function getResearchNews(
  symbol: string
): Promise<StockNewsTickerArticlesResponse> {
  return stockNewsRequest<StockNewsTickerArticlesResponse>("", {
    items: "50",
    sourceexclude: "Benzinga,The Motley Fool,Zacks Investment Research",
    tickers: symbol,
    type: "Article",
  });
}
