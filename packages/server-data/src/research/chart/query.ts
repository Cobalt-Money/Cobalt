import { fmpStableGet } from "@cobalt-web/clients/fmp";

import { num, str } from "../_shared/parse.js";
import { withFmpUpstream } from "../_shared/fmp-upstream.js";

export type TimePeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "All";

export interface FmpHistoricalPoint {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number;
}

function chartPathAndParams(
  symbol: string,
  period: TimePeriod,
): { params: Record<string, string | number>; path: string } {
  switch (period) {
    case "1D": {
      return {
        params: { symbol },
        path: "historical-chart/5min",
      };
    }
    case "1W": {
      return {
        params: { symbol },
        path: "historical-chart/1hour",
      };
    }
    default: {
      const fromDate = periodStartDate(period);
      return {
        params: { from: fromDate, symbol },
        path: "historical-price-eod/full",
      };
    }
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodStartDate(period: TimePeriod): string {
  const now = new Date();
  switch (period) {
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return fmtDate(d);
    }
    case "3M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return fmtDate(d);
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return fmtDate(d);
    }
    case "YTD": {
      return `${now.getFullYear()}-01-01`;
    }
    case "1Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return fmtDate(d);
    }
    case "All": {
      return "1990-01-01";
    }
    default: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return fmtDate(d);
    }
  }
}

export async function getChart(symbol: string, period: TimePeriod): Promise<FmpHistoricalPoint[]> {
  const { params, path } = chartPathAndParams(symbol, period);
  const raw = await withFmpUpstream(() => fmpStableGet(path, params));

  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as Record<string, unknown>).historical)
  ) {
    items = (raw as Record<string, unknown>).historical as unknown[];
  } else {
    return [];
  }

  const points: FmpHistoricalPoint[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const o = entry as Record<string, unknown>;
    const dateStr = str(o.date);
    if (!dateStr) {
      continue;
    }
    points.push({
      close: num(o.close) ?? 0,
      date: dateStr,
      high: num(o.high) ?? 0,
      low: num(o.low) ?? 0,
      open: num(o.open) ?? 0,
      volume: num(o.volume) ?? 0,
    });
  }

  return points.toReversed();
}
