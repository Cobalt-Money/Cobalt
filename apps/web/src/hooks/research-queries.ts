import type {
  FmpProfile,
  ScreenerResponse,
  ScreenerRow,
} from "@cobalt-web/server-data/research/schemas";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { ChartPeriod } from "@/components/research/ticker/lightweight-price-chart";
import { researchApi } from "@/lib/clients/api-client";

export type { FmpProfile, ScreenerResponse, ScreenerRow };

// ── Types ─────────────────────────────────────────────────────────

export interface TickerQuote {
  change: number;
  changePercent: number;
  companyName: string;
  currentPrice: number;
}

interface ChartApiPoint {
  close?: number;
  high?: number;
  id?: string;
  low?: number;
  open?: number;
  price: number;
  time: string;
  volume: number;
}

export interface ChartPoint {
  time: number;
  value: number;
}

/** Command K row (from screener universe). */
export interface TickerSearchItem {
  name: string;
  symbol: string;
  type: string;
  /** Present when FMP screener included a last price. */
  price?: number;
}

export function screenerRowToTickerSearchItem(row: ScreenerRow): TickerSearchItem {
  const symbol = row.symbol.trim();
  const name = row.companyName?.trim() || symbol;
  const type = row.isEtf === true ? "ETF" : "Equity";
  const price = typeof row.price === "number" && Number.isFinite(row.price) ? row.price : undefined;
  return { name, price, symbol, type };
}

// ── Helpers ───────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const json: unknown = await res.json();
  if (!res.ok) {
    const err = json as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

function toChartPoints(apiData: ChartApiPoint[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const d of apiData) {
    const date = new Date(d.time);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    points.push({ time: Math.floor(date.getTime() / 1000), value: d.price });
  }
  return points;
}

// ── Queries ───────────────────────────────────────────────────────

/** Up to ~10k NASDAQ + NYSE names. Shared by Cmd-K + research table. */
export const screenerUniverseQuery = queryOptions({
  queryFn: async () => {
    const res = await researchApi.screener.$get({
      query: {
        country: "US",
        isActivelyTrading: "true",
        isEtf: "false",
        limit: 10_000,
        marketCapMoreThan: 0,
      },
    });
    return parseResponse<ScreenerResponse>(res);
  },
  queryKey: ["research", "screener", "universe"] as const,
  staleTime: 1000 * 60 * 5,
});

export const quoteQuery = (symbol: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await researchApi.quote.$get({ query: { symbol } });
      return parseResponse<TickerQuote>(res);
    },
    queryKey: ["ticker", symbol, "quote"] as const,
    staleTime: 1000 * 30,
  });

export const tickerOverview = (symbol: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await researchApi.overview.$get({ query: { symbol } });
      return parseResponse<FmpProfile>(res);
    },
    queryKey: ["ticker", symbol, "overview"] as const,
    staleTime: 1000 * 60 * 5,
  });

export const chartQuery = (symbol: string, timePeriod: ChartPeriod) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await researchApi.chart.$get({
        query: { symbol, timePeriod },
      });
      const json = await parseResponse<{ data: ChartApiPoint[] }>(res);
      return toChartPoints(json.data);
    },
    queryKey: ["ticker", symbol, "chart", timePeriod] as const,
    staleTime: 1000 * 60,
  });

/**
 * OHLC bars around a date for the manual-holding cost-basis / sell-price
 * scrubbers. Cached by (symbol, date) so repeated opens of the picker for the
 * same ticker+date hit the local cache instead of refetching.
 */
export const tickerHistoryQuery = (symbol: string, date: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await researchApi["ticker-history"].$get({
        query: { date, symbol },
      });
      const json = await parseResponse<{
        points: { close: number; date: string; high: number; low: number }[];
      }>(res);
      const history = json.points;
      const latestPrice = history.length > 0 ? (history.at(-1)?.close ?? null) : null;
      return { history, latestPrice };
    },
    queryKey: ["ticker", symbol, "history", date] as const,
    staleTime: 1000 * 60 * 5,
  });
