import {
  holdingsNewsQuerySchema,
  holdingsNewsResponseSchema,
} from "@cobalt-web/server-data/brokerage/merged-schemas";
import { errorResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "@cobalt-web/server-data/news/for-you/queries";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Financial events / news for tickers held across SnapTrade and Plaid investment positions.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/holdings-news",
  request: { query: holdingsNewsQuerySchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: holdingsNewsResponseSchema },
      },
      description: "Holdings-linked news",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get news for holding tickers",
  tags: ["Brokerage"],
});

export const holdingsNewsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { limit } = c.req.valid("query");
      const tickers = await getUserStockTickers(c.var.user.id);

      if (tickers.length === 0) {
        c.header("Cache-Control", "private, max-age=60");
        return c.json({ news: [] }, 200);
      }

      const result = await getFinancialEventsForTickers(
        c.var.user.id,
        tickers,
        limit
      );

      c.header("Cache-Control", "private, max-age=60");
      return c.json({ news: result.events }, 200);
    } catch {
      return c.json({ error: "Failed to fetch holdings news" }, 500);
    }
  }
);
