import {
  DEFAULT_COMPANY_SCREENER,
  fmpCompanyScreenerNasdaqNyse,
} from "@cobalt-web/server-data/research/fmp-screener";
import { enrichScreenerRowsWithRevenueAndRating } from "@cobalt-web/server-data/research/fmp-screener-metrics";
import {
  screenerQuerySchema,
  screenerResponseSchema,
} from "@cobalt-web/server-data/research/schemas";
import { screenerQueryToCompanyParams } from "@cobalt-web/server-data/research/screener-query";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/screener",
  request: { query: screenerQuerySchema },
  responses: {
    200: jsonContent(screenerResponseSchema, "FMP company screener results"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(screenerQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "FMP upstream failed"),
  },
  summary: "Screen stocks (FMP screener + revenue + P/E from `fundamentals` table)",
  tags: ["Research"],
});

export const screenerRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  const mergedParams = {
    ...DEFAULT_COMPANY_SCREENER,
    ...screenerQueryToCompanyParams(query),
  };
  const results = await fmpCompanyScreenerNasdaqNyse(mergedParams);
  const enriched = await enrichScreenerRowsWithRevenueAndRating(results);
  c.header("Cache-Control", "private, s-maxage=60, stale-while-revalidate=300");
  return c.json({ count: enriched.length, results: enriched }, 200);
});
