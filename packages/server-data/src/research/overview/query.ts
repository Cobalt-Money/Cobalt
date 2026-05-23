import { fmpStableGet } from "@cobalt-web/clients/fmp";

import { ApiError } from "../../_shared/api-error.js";
import { firstFiniteNum, firstObject, num, str } from "../_shared/parse.js";
import { withFmpUpstream } from "../_shared/fmp-upstream.js";
import type { FmpProfile } from "./schema.js";

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
export async function getProfile(symbol: string): Promise<FmpProfile> {
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
