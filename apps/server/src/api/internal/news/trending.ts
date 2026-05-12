import { getUserStockTickers } from "@cobalt-web/server-data/news/for-you/queries";
import { getTrendingHeadlines } from "@cobalt-web/server-data/news/trending/queries";
import {
  trendingQuerySchema,
  trendingResponseSchema,
} from "@cobalt-web/server-data/news/trending/schemas";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/trending",
  request: { query: trendingQuerySchema },
  responses: {
    200: jsonContent(trendingResponseSchema, "Trending headlines based on user holdings"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(trendingQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "Stock News upstream failed"),
  },
  summary: "Trending headlines",
  tags: ["News"],
});

export const trendingRouter = createApp().openapi(route, async (c) => {
  const { limit } = c.req.valid("query");
  const tickers = await getUserStockTickers(c.var.user.id);

  if (tickers.length === 0) {
    return c.json({ headlines: [] }, 200);
  }

  const headlines = await getTrendingHeadlines(c.var.user.id, tickers, limit);

  c.header("Cache-Control", "private, max-age=60");
  return c.json({ headlines }, 200);
});
