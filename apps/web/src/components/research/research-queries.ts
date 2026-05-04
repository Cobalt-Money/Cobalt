import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import type { ChartPeriod } from "@/components/research/ticker/lightweight-price-chart";
import { researchApi } from "@/lib/clients/api-client";

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

export type ScreenerRow = Record<string, unknown>;

export interface ScreenerResponse {
  count: number;
  results: ScreenerRow[];
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

// ── Query options ─────────────────────────────────────────────────

export const screenerQueryOptions = queryOptions({
  queryFn: async () => {
    const res = await researchApi.screener.$get({ query: {} });
    return parseResponse<ScreenerResponse>(res);
  },
  queryKey: ["research", "screener"],
  staleTime: 1000 * 60,
});

export const quoteQueryOptions = (symbol: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await researchApi.quote.$get({ query: { symbol } });
      return parseResponse<TickerQuote>(res);
    },
    queryKey: ["ticker", symbol, "quote"] as const,
    staleTime: 1000 * 30,
  });

export const overviewQueryOptions = (symbol: string) =>
  queryOptions({
    queryFn: async () => {
      const res = await researchApi.overview.$get({ query: { symbol } });
      return parseResponse<Record<string, unknown>>(res);
    },
    queryKey: ["ticker", symbol, "overview"] as const,
    staleTime: 1000 * 60 * 5,
  });

export const chartQueryOptions = (symbol: string, timePeriod: ChartPeriod) =>
  queryOptions({
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

// ── Screener → ticker cache bridging ──────────────────────────────

/** Finds the screener row for a symbol in the React Query cache, if loaded. */
export function screenerRowFor(queryClient: QueryClient, symbol: string): ScreenerRow | undefined {
  const cached = queryClient.getQueryData<ScreenerResponse>(screenerQueryOptions.queryKey);
  const target = symbol.trim().toUpperCase();
  return cached?.results.find((r) => {
    const s = r.symbol ?? r.ticker;
    return typeof s === "string" && s.trim().toUpperCase() === target;
  });
}

/** Maps a screener row to the quote shape, for placeholder rendering. */
export function screenerRowToQuote(
  row: ScreenerRow,
  fallbackSymbol: string,
): TickerQuote | undefined {
  const price = typeof row.price === "number" ? row.price : null;
  if (price === null) {
    return;
  }
  const pct = typeof row.pctChange1d === "number" ? row.pctChange1d : 0;
  const companyName =
    (typeof row.companyName === "string" && row.companyName.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    fallbackSymbol;
  return {
    change: (price * pct) / 100,
    changePercent: pct,
    companyName,
    currentPrice: price,
  };
}
