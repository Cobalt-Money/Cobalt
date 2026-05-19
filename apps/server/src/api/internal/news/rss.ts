import { getRssArticles } from "@cobalt-web/server-data/news/rss/queries";
import { rssQuerySchema, rssResponseSchema } from "@cobalt-web/server-data/news/rss/schemas";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "RSS feed articles filtered by company/category",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/rss",
  request: { query: rssQuerySchema },
  responses: {
    200: jsonContent(rssResponseSchema, "RSS articles with filter options"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(rssQuerySchema),
  },
  summary: "RSS feed articles",
  tags: ["News"],
});

export const rssRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  const result = await getRssArticles(c.var.user.id, query);

  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
