import {
  holdingsNewsQuerySchema,
  holdingsNewsResponseSchema,
} from "@cobalt-web/server-data/brokerage/merged-schemas";
import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "@cobalt-web/server-data/news/for-you/queries";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Financial events / news for tickers held across SnapTrade and Plaid investment positions.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/holdings-news",
  request: { query: holdingsNewsQuerySchema },
  responses: {
    200: jsonContent(holdingsNewsResponseSchema, "Holdings-linked news"),
    422: validationErrorResponse(holdingsNewsQuerySchema),
  },
  summary: "Get news for holding tickers",
  tags: ["Brokerage"],
});

export const holdingsNewsRouter = createApp().openapi(route, async (c) => {
  const { limit } = c.req.valid("query");
  const tickers = await getUserStockTickers(c.var.user.id);

  if (tickers.length === 0) {
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ news: [] }, 200);
  }

  const result = await getFinancialEventsForTickers(c.var.user.id, tickers, limit);

  c.header("Cache-Control", "private, max-age=60");
  return c.json({ news: result.events }, 200);
});
