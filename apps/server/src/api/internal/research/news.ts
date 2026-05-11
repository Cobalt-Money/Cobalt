import { getResearchNews } from "@cobalt-web/server-data/research/queries";
import { newsResponseSchema, symbolQuerySchema } from "@cobalt-web/server-data/research/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/news",
  request: { query: symbolQuerySchema },
  responses: {
    200: jsonContent(newsResponseSchema, "News articles"),
    422: validationErrorResponse(symbolQuerySchema),
  },
  summary: "Get ticker-specific news",
  tags: ["Research"],
});

export const newsRouter = createApp().openapi(route, async (c) => {
  const { symbol } = c.req.valid("query");
  const news = await getResearchNews(symbol);
  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=1800");
  return c.json(news, 200);
});
