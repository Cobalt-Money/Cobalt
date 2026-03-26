import { getRssArticles } from "@cobalt-web/server-data/news/rss/queries";
import {
  rssQuerySchema,
  rssResponseSchema,
} from "@cobalt-web/server-data/news/rss/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description: "RSS feed articles filtered by company/category",
  method: "get",
  path: "/rss",
  request: { query: rssQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: rssResponseSchema } },
      description: "RSS articles with filter options",
    },
  },
  summary: "RSS feed articles",
  tags: ["News"],
});

export const rssRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const query = c.req.valid("query");
  const result = await getRssArticles(c.var.user.id, query);

  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
