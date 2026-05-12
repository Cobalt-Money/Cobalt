import { fmpStableGet } from "@cobalt-web/clients/fmp";

import { withFmpUpstream } from "./fmp-errors.js";

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

function parseScreenerRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is Record<string, unknown> =>
      row !== null && typeof row === "object" && !Array.isArray(row),
  );
}

function marketCapOf(row: Record<string, unknown>): number {
  const v = row.marketCap;
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
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
