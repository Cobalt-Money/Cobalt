import {
  getFinancialEventsForTickers,
  getUserStockTickers,
} from "@cobalt-web/server-data/news/for-you/queries";
import {
  forYouErrorSchema,
  forYouQuerySchema,
  forYouResponseSchema,
} from "@cobalt-web/server-data/news/for-you/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/events/for-you",
  request: { query: forYouQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: forYouResponseSchema } },
      description: "Personalized financial events based on user holdings",
    },
    500: {
      content: { "application/json": { schema: forYouErrorSchema } },
      description: "Server error",
    },
  },
  summary: "Get personalized financial events",
  tags: ["News"],
});

export const forYouRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { limit, cursor, topic } = c.req.valid("query");

      const tickers = await getUserStockTickers(c.var.user.id);

      if (tickers.length === 0) {
        return c.json({ events: [], hasMore: false }, 200);
      }

      const result = await getFinancialEventsForTickers(
        c.var.user.id,
        tickers,
        limit,
        cursor,
        topic
      );

      c.header("Cache-Control", "private, max-age=60");
      return c.json(result, 200);
    } catch {
      return c.json({ error: "Failed to fetch personalized events" }, 500);
    }
  }
);
