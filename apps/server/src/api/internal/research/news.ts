import { getResearchNews } from "@cobalt-web/server-data/research/queries";
import {
  errorResponseSchema,
  newsResponseSchema,
  symbolQuerySchema,
} from "@cobalt-web/server-data/research/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/news",
  request: { query: symbolQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: newsResponseSchema } },
      description: "News articles",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get ticker-specific news",
  tags: ["Research"],
});

export const newsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const { symbol } = c.req.valid("query");
      const news = await getResearchNews(symbol);
      c.header(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=1800"
      );
      return c.json(news, 200);
    } catch {
      return c.json({ error: "Failed to fetch news" }, 500);
    }
  }
);
