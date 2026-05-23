import { fmpStableGet } from "@cobalt-web/clients/fmp";
import { db } from "@cobalt-web/db";
import type { z } from "zod";

import { withFmpUpstream } from "../_shared/fmp-upstream.js";
import type { screenerQuerySchema } from "./schema.js";

/** Parameters for `GET /stable/company-screener` (see FMP docs). */
export interface CompanyScreenerParams {
  betaLowerThan?: number;
  betaMoreThan?: number;
  country?: string;
  dividendLowerThan?: number;
  dividendMoreThan?: number;
  exchange?: string;
  industry?: string;
  isActivelyTrading?: boolean;
  isEtf?: boolean;
  isFund?: boolean;
  limit?: number;
  marketCapLowerThan?: number;
  marketCapMoreThan?: number;
  priceLowerThan?: number;
  priceMoreThan?: number;
  sector?: string;
  volumeLowerThan?: number;
  volumeMoreThan?: number;
}

/** Default batch when the client sends no filters — US large-cap common stocks. */
export const DEFAULT_COMPANY_SCREENER: CompanyScreenerParams = {
  country: "US",
  isActivelyTrading: true,
  isEtf: false,
  isFund: false,
  limit: 100,
  marketCapMoreThan: 1_000_000_000,
};

const NUMERIC_FIELDS = ["price", "marketCap", "beta", "volume"] as const;

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeScreenerRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of NUMERIC_FIELDS) {
    if (key in out) {
      out[key] = coerceNumber(out[key]);
    }
  }
  return out;
}

function parseScreenerRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(
      (row): row is Record<string, unknown> =>
        row !== null && typeof row === "object" && !Array.isArray(row),
    )
    .map(normalizeScreenerRow);
}

function marketCapOf(row: Record<string, unknown>): number {
  const n = coerceNumber(row.marketCap);
  return n ?? 0;
}

function rowSymbolUpper(row: Record<string, unknown>): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

/**
 * Company screener with results from **NASDAQ** and **NYSE** only.
 * Runs two FMP `company-screener` calls (one per exchange), merges, dedupes by symbol,
 * sorts by market cap descending, then applies `limit`.
 * Any `exchange` in `params` is ignored.
 */
export async function fmpCompanyScreenerNasdaqNyse(
  params: CompanyScreenerParams,
): Promise<Record<string, unknown>[]> {
  const { exchange: _ignored, limit: lim, ...rest } = params;
  const limit = typeof lim === "number" && lim > 0 ? lim : 100;

  const [rawNasdaq, rawNyse] = await withFmpUpstream(() =>
    Promise.all([
      fmpCompanyScreener({ ...rest, exchange: "NASDAQ", limit }),
      fmpCompanyScreener({ ...rest, exchange: "NYSE", limit }),
    ]),
  );

  const bySym = new Map<string, Record<string, unknown>>();
  for (const row of [...parseScreenerRows(rawNasdaq), ...parseScreenerRows(rawNyse)]) {
    const sym = rowSymbolUpper(row);
    if (!sym) {
      continue;
    }
    const existing = bySym.get(sym);
    if (!existing || marketCapOf(row) > marketCapOf(existing)) {
      bySym.set(sym, row);
    }
  }

  return [...bySym.values()].toSorted((a, b) => marketCapOf(b) - marketCapOf(a)).slice(0, limit);
}

export function fmpCompanyScreener(params: CompanyScreenerParams): Promise<unknown> {
  return fmpStableGet("company-screener", {
    betaLowerThan: params.betaLowerThan,
    betaMoreThan: params.betaMoreThan,
    country: params.country,
    dividendLowerThan: params.dividendLowerThan,
    dividendMoreThan: params.dividendMoreThan,
    exchange: params.exchange,
    industry: params.industry,
    isActivelyTrading: params.isActivelyTrading,
    isEtf: params.isEtf,
    isFund: params.isFund,
    limit: params.limit,
    marketCapLowerThan: params.marketCapLowerThan,
    marketCapMoreThan: params.marketCapMoreThan,
    priceLowerThan: params.priceLowerThan,
    priceMoreThan: params.priceMoreThan,
    sector: params.sector,
    volumeLowerThan: params.volumeLowerThan,
    volumeMoreThan: params.volumeMoreThan,
  });
}

/**
 * Enriches screener rows with revenue and P/E from the `fundamentals` table
 * (single batched query — no per-symbol FMP calls).
 */
export async function enrichScreenerRowsWithRevenueAndRating(
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const symbols = [...new Set(rows.map(rowSymbolUpper).filter(Boolean))];
  if (symbols.length === 0) {
    return rows;
  }

  const fundRows = await db.query.fundamentals.findMany({
    columns: { eps: true, revenue: true, symbol: true },
    where: { symbol: { in: symbols } },
  });

  const bySymbol = new Map(fundRows.map((r) => [r.symbol, r]));

  return rows.map((row) => {
    const sym = rowSymbolUpper(row);
    const f = sym ? bySymbol.get(sym) : undefined;
    if (!f) {
      return {
        ...row,
        peRatio: undefined,
        revenue: undefined,
      };
    }

    const price = typeof row.price === "number" && Number.isFinite(row.price) ? row.price : null;
    const eps = f.eps === null ? null : Number.parseFloat(String(f.eps));
    const peRatio = price !== null && eps !== null && eps !== 0 ? price / eps : undefined;

    return {
      ...row,
      peRatio,
      revenue: f.revenue === null ? undefined : Number(f.revenue),
    };
  });
}

type ScreenerQueryInput = z.infer<typeof screenerQuerySchema>;

function triBool(v: unknown): boolean | undefined {
  if (v === "true") {
    return true;
  }
  if (v === "false") {
    return false;
  }
  return undefined;
}

function omitUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Maps validated `GET /screener` query to FMP `CompanyScreenerParams`. */
export function screenerQueryToCompanyParams(
  q: ScreenerQueryInput,
): Partial<CompanyScreenerParams> {
  const isEtf = triBool(q.isEtf);
  const isActivelyTrading = triBool(q.isActivelyTrading);

  return omitUndefined({
    betaLowerThan: q.betaLowerThan,
    betaMoreThan: q.betaMoreThan,
    country: q.country,
    dividendLowerThan: q.dividendLowerThan,
    dividendMoreThan: q.dividendMoreThan,
    exchange: q.exchange,
    industry: q.industry,
    isActivelyTrading,
    isEtf,
    limit: q.limit,
    marketCapLowerThan: q.marketCapLowerThan,
    marketCapMoreThan: q.marketCapMoreThan,
    priceLowerThan: q.priceLowerThan,
    priceMoreThan: q.priceMoreThan,
    sector: q.sector,
    volumeLowerThan: q.volumeLowerThan,
    volumeMoreThan: q.volumeMoreThan,
  });
}
