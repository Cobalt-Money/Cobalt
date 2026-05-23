import { searchTickers } from "@cobalt-web/server-data/tickers/queries";
import { tickerSearchResponseSchema } from "@cobalt-web/server-data/tickers/schemas";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/search",
  responses: {
    200: jsonContent(tickerSearchResponseSchema, "All cached tickers for client-side search"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Search tickers (cached NASDAQ + NYSE list)",
  tags: ["Research"],
});

export const tickerSearchRouter = createApp().openapi(route, async (c) => {
  const tickers = await searchTickers();
  c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return c.json(tickerSearchResponseSchema.parse({ count: tickers.length, tickers }), 200);
});
