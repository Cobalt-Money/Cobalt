import { getUserStockTickers } from "@cobalt-web/server-data/news/for-you/queries";
import { getTrendingHeadlines } from "@cobalt-web/server-data/news/trending/queries";
import {
  trendingQuerySchema,
  trendingResponseSchema,
} from "@cobalt-web/server-data/news/trending/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/trending",
  request: { query: trendingQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: trendingResponseSchema } },
      description: "Trending headlines based on user holdings",
    },
  },
  summary: "Trending headlines",
  tags: ["News"],
});

export const trendingRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { limit } = c.req.valid("query");
    const tickers = await getUserStockTickers(c.var.user.id);

    if (tickers.length === 0) {
      return c.json({ headlines: [] }, 200);
    }

    const headlines = await getTrendingHeadlines(c.var.user.id, tickers, limit);

    c.header("Cache-Control", "private, max-age=60");
    return c.json({ headlines }, 200);
  }
);
