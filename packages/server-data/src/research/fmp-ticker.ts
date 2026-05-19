import { fmpStableGet } from "@cobalt-web/clients/fmp";

import { ApiError } from "../_shared/api-error.js";
import { withFmpUpstream } from "./fmp-errors.js";
import type { FmpProfile } from "./schemas.js";

// ── Types ─────────────────────────────────────────────────────────

export interface FmpQuote {
  change: number;
  changePercent: number;
  companyName: string;
  currentPrice: number;
}

export type { FmpProfile };

export interface FmpHistoricalPoint {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function firstObject(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    const [first] = raw;
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return null;
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
}

/** First parseable finite number among candidates (profile + enrichment rows). */
function firstFiniteNum(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    const n = num(c);
    if (n !== null) {
      return n;
    }
  }
  return null;
}

// ── Quote ─────────────────────────────────────────────────────────

export async function fmpGetQuote(symbol: string): Promise<FmpQuote> {
  const raw = await withFmpUpstream(() => fmpStableGet("batch-quote", { symbols: symbol }));
  const arr = Array.isArray(raw) ? raw : [];
  const item = firstObject(arr[0] ?? raw);

  if (!item) {
    throw new ApiError(404, "ticker_not_found", `No quote data available for ${symbol}`);
  }

  return {
    change: num(item.change) ?? 0,
    changePercent: num(item.changesPercentage ?? item.changePercentage) ?? 0,
    companyName: str(item.name) ?? str(item.companyName) ?? symbol,
    currentPrice: num(item.price) ?? 0,
  };
}

// ── Profile / Overview ────────────────────────────────────────────

function profilePe(
  item: Record<string, unknown>,
  kmTtm: Record<string, unknown> | null,
  ratiosRow: Record<string, unknown> | null,
): number | null {
  return firstFiniteNum(
    item.pe,
    item.priceToEarningsRatio,
    item.peRatio,
    item.trailingPE,
    item.trailingPe,
    kmTtm?.peRatioTTM,
    kmTtm?.peRatio,
    kmTtm?.priceEarningsRatioTTM,
    ratiosRow?.priceToEarningsRatio,
    ratiosRow?.peRatio,
  );
}

function profileRevenue(
  item: Record<string, unknown>,
  kmTtm: Record<string, unknown> | null,
  incomeRow: Record<string, unknown> | null,
): number | null {
  return firstFiniteNum(item.revenue, kmTtm?.revenueTTM, kmTtm?.revenue, incomeRow?.revenue);
}

function mapProfileItemToFmpProfile(
  symbol: string,
  item: Record<string, unknown>,
  pe: number | null,
  revenue: number | null,
): FmpProfile {
  return {
    beta: num(item.beta),
    ceo: str(item.ceo),
    companyName: str(item.companyName) ?? symbol,
    country: str(item.country),
    currency: str(item.currency),
    description: str(item.description),
    dividendYield: num(item.lastDiv),
    exchange: str(item.exchangeShortName ?? item.exchange),
    fullTimeEmployees: num(item.fullTimeEmployees)
      ? Math.round(num(item.fullTimeEmployees) as number)
      : null,
    industry: str(item.industry),
    ipoDate: str(item.ipoDate),
    /** Stable API uses `marketCap`; legacy/v3 samples used `mktCap`. */
    marketCap: num(item.mktCap ?? item.marketCap ?? item.market_cap ?? item.marketCapitalization),
    pe,
    price: num(item.price),
    revenue,
    sector: str(item.sector),
    symbol: str(item.symbol) ?? symbol,
    website: str(item.website),
  };
}

/**
 * Stable `/profile` often omits P/E; merge optional `key-metrics-ttm`,
 * latest `ratios` row (screener P/E), and latest annual `income-statement` for revenue.
 */
export async function fmpGetProfile(symbol: string): Promise<FmpProfile> {
  const [profileRes, keyMetricsTtmRes, ratiosRes, incomeRes] = await withFmpUpstream(() =>
    Promise.allSettled([
      fmpStableGet("profile", { symbol }),
      fmpStableGet("key-metrics-ttm", { symbol }),
      fmpStableGet("ratios", { limit: 1, symbol }),
      fmpStableGet("income-statement", {
        limit: 1,
        period: "annual",
        symbol,
      }),
    ]),
  );

  if (profileRes.status === "rejected") {
    const { reason } = profileRes;
    if (reason instanceof ApiError) {
      throw reason;
    }
    const message = reason instanceof Error ? reason.message : String(reason);
    throw new ApiError(502, "fmp_upstream_failed", message);
  }

  const raw = profileRes.value;
  const item = firstObject(Array.isArray(raw) ? raw[0] : raw);

  if (!item) {
    throw new ApiError(404, "ticker_not_found", `No profile data available for ${symbol}`);
  }

  const kmTtm =
    keyMetricsTtmRes.status === "fulfilled" ? firstObject(keyMetricsTtmRes.value) : null;
  const ratiosRow = ratiosRes.status === "fulfilled" ? firstObject(ratiosRes.value) : null;
  const incomeRow = incomeRes.status === "fulfilled" ? firstObject(incomeRes.value) : null;

  const pe = profilePe(item, kmTtm, ratiosRow);
  const revenue = profileRevenue(item, kmTtm, incomeRow);

  return mapProfileItemToFmpProfile(symbol, item, pe, revenue);
}

// ── Historical Chart ──────────────────────────────────────────────

export type TimePeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "All";

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

/**
 * Fetch end-of-day historical points for an arbitrary date range.
 * Used by the manual-holding cost-basis picker, which needs closes around a
 * user-supplied purchase date (not relative to today).
 */
export async function fmpGetHistoricalRange(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<FmpHistoricalPoint[]> {
  const raw = await withFmpUpstream(() =>
    fmpStableGet("historical-price-eod/full", {
      from: fromDate,
      symbol,
      to: toDate,
    }),
  );

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

export async function fmpGetChart(
  symbol: string,
  period: TimePeriod,
): Promise<FmpHistoricalPoint[]> {
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
