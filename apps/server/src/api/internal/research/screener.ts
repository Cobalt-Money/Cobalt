import { enrichScreenerRowsWithReturns } from "@cobalt-web/server-data/research/fmp-returns";
import {
  DEFAULT_COMPANY_SCREENER,
  fmpCompanyScreenerNasdaqNyse,
} from "@cobalt-web/server-data/research/fmp-screener";
import type { CompanyScreenerParams } from "@cobalt-web/server-data/research/fmp-screener";
import { enrichScreenerRowsWithRevenueAndRating } from "@cobalt-web/server-data/research/fmp-screener-metrics";
import {
  errorResponseSchema,
  screenerQuerySchema,
  screenerResponseSchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

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

function queryToParams(q: Record<string, unknown>): CompanyScreenerParams {
  const isEtf = triBool(q.isEtf);
  const isActivelyTrading = triBool(q.isActivelyTrading);

  return {
    betaLowerThan: q.betaLowerThan as number | undefined,
    betaMoreThan: q.betaMoreThan as number | undefined,
    country: q.country as string | undefined,
    dividendLowerThan: q.dividendLowerThan as number | undefined,
    dividendMoreThan: q.dividendMoreThan as number | undefined,
    exchange: q.exchange as string | undefined,
    industry: q.industry as string | undefined,
    isActivelyTrading,
    isEtf,
    limit: q.limit as number | undefined,
    marketCapLowerThan: q.marketCapLowerThan as number | undefined,
    marketCapMoreThan: q.marketCapMoreThan as number | undefined,
    priceLowerThan: q.priceLowerThan as number | undefined,
    priceMoreThan: q.priceMoreThan as number | undefined,
    sector: q.sector as string | undefined,
    volumeLowerThan: q.volumeLowerThan as number | undefined,
    volumeMoreThan: q.volumeMoreThan as number | undefined,
  };
}

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/screener",
  request: { query: screenerQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: screenerResponseSchema },
      },
      description: "FMP company screener results",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
    503: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "FMP not configured or unavailable",
    },
  },
  summary:
    "Screen stocks (FMP screener + quotes + revenue + P/E + analyst consensus per symbol)",
  tags: ["Research"],
});

export const screenerRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const query = c.req.valid("query");
    try {
      const results = await fmpCompanyScreenerNasdaqNyse({
        ...DEFAULT_COMPANY_SCREENER,
        ...omitUndefined(queryToParams(query)),
      });
      const withReturns = await enrichScreenerRowsWithReturns(results);
      const enriched =
        await enrichScreenerRowsWithRevenueAndRating(withReturns);
      c.header(
        "Cache-Control",
        "private, s-maxage=60, stale-while-revalidate=300"
      );
      return c.json({ count: enriched.length, results: enriched }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("FMP_API_KEY")) {
        return c.json(
          { error: "Market data is not configured (FMP_API_KEY)." },
          503
        );
      }
      return c.json({ error: message }, 500);
    }
  }
);
