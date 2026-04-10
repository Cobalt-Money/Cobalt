import { fmpStableGet } from "@cobalt-web/clients/fmp";

// ── Types ─────────────────────────────────────────────────────────

export interface FmpQuote {
  change: number;
  changePercent: number;
  companyName: string;
  currentPrice: number;
}

export interface FmpProfile {
  beta: number | null;
  ceo: string | null;
  companyName: string;
  country: string | null;
  currency: string | null;
  description: string | null;
  dividendYield: number | null;
  eps: number | null;
  exchange: string | null;
  fullTimeEmployees: number | null;
  industry: string | null;
  ipoDate: string | null;
  marketCap: number | null;
  pe: number | null;
  price: number | null;
  sector: string | null;
  symbol: string;
  website: string | null;
}

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

// ── Quote ─────────────────────────────────────────────────────────

export async function fmpGetQuote(symbol: string): Promise<FmpQuote> {
  const raw = await fmpStableGet("batch-quote", { symbols: symbol });
  const arr = Array.isArray(raw) ? raw : [];
  const item = firstObject(arr[0] ?? raw);

  if (!item) {
    throw new Error(`No quote data available for ${symbol}`);
  }

  return {
    change: num(item.change) ?? 0,
    changePercent: num(item.changesPercentage ?? item.changePercentage) ?? 0,
    companyName: str(item.name) ?? str(item.companyName) ?? symbol,
    currentPrice: num(item.price) ?? 0,
  };
}

// ── Profile / Overview ────────────────────────────────────────────

export async function fmpGetProfile(symbol: string): Promise<FmpProfile> {
  const raw = await fmpStableGet("profile", { symbol });
  const item = firstObject(Array.isArray(raw) ? raw[0] : raw);

  if (!item) {
    throw new Error(`No profile data available for ${symbol}`);
  }

  return {
    beta: num(item.beta),
    ceo: str(item.ceo),
    companyName: str(item.companyName) ?? symbol,
    country: str(item.country),
    currency: str(item.currency),
    description: str(item.description),
    dividendYield: num(item.lastDiv),
    eps: num(item.eps),
    exchange: str(item.exchangeShortName ?? item.exchange),
    fullTimeEmployees: num(item.fullTimeEmployees)
      ? Math.round(num(item.fullTimeEmployees) as number)
      : null,
    industry: str(item.industry),
    ipoDate: str(item.ipoDate),
    marketCap: num(item.mktCap),
    pe: num(item.pe),
    price: num(item.price),
    sector: str(item.sector),
    symbol: str(item.symbol) ?? symbol,
    website: str(item.website),
  };
}

// ── Historical Chart ──────────────────────────────────────────────

type TimePeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "All";

function chartPathAndParams(
  symbol: string,
  period: TimePeriod
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

export async function fmpGetChart(
  symbol: string,
  period: TimePeriod
): Promise<FmpHistoricalPoint[]> {
  const { params, path } = chartPathAndParams(symbol, period);
  const raw = await fmpStableGet(path, params);

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
