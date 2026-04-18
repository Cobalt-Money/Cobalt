import type { z } from "zod";

import type { CompanyScreenerParams } from "./fmp-screener.js";
import type { screenerQuerySchema } from "./schemas.js";

export type ScreenerQueryInput = z.infer<typeof screenerQuerySchema>;

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
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/** Maps validated `GET /screener` query to FMP `CompanyScreenerParams`. */
export function screenerQueryToCompanyParams(
  q: ScreenerQueryInput
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
