import {
  DEFAULT_COMPANY_SCREENER,
  fmpCompanyScreenerNasdaqNyse,
} from "@cobalt-web/server-data/research/fmp-screener";
import { enrichScreenerRowsWithRevenueAndRating } from "@cobalt-web/server-data/research/fmp-screener-metrics";
import {
  errorResponseSchema,
  screenerQuerySchema,
  screenerResponseSchema,
} from "@cobalt-web/server-data/research/schemas";
import { screenerQueryToCompanyParams } from "@cobalt-web/server-data/research/screener-query";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

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
  summary: "Screen stocks (FMP screener + revenue + P/E from `fundamentals` table)",
  tags: ["Research"],
});

export const screenerRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const query = c.req.valid("query");
  const mergedParams = {
    ...DEFAULT_COMPANY_SCREENER,
    ...screenerQueryToCompanyParams(query),
  };
  try {
    const results = await fmpCompanyScreenerNasdaqNyse(mergedParams);
    const enriched = await enrichScreenerRowsWithRevenueAndRating(results);
    c.header("Cache-Control", "private, s-maxage=60, stale-while-revalidate=300");
    return c.json({ count: enriched.length, results: enriched }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("FMP_API_KEY")) {
      return c.json({ error: "Market data is not configured (FMP_API_KEY)." }, 503);
    }
    return c.json({ error: message }, 500);
  }
});
