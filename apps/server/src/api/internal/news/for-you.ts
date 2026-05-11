import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "@cobalt-web/server-data/news/for-you/queries";
import {
  forYouQuerySchema,
  forYouResponseSchema,
} from "@cobalt-web/server-data/news/for-you/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/events/for-you",
  request: { query: forYouQuerySchema },
  responses: {
    200: jsonContent(forYouResponseSchema, "Personalized financial events based on user holdings"),
    422: validationErrorResponse(forYouQuerySchema),
  },
  summary: "Get personalized financial events",
  tags: ["News"],
});

export const forYouRouter = createApp().openapi(route, async (c) => {
  const { limit, cursor, topic } = c.req.valid("query");

  const tickers = await getUserStockTickers(c.var.user.id);

  if (tickers.length === 0) {
    return c.json({ events: [], hasMore: false }, 200);
  }

  const result = await getFinancialEventsForTickers(c.var.user.id, tickers, limit, cursor, topic);

  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
