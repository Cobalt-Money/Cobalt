import { getFinancialEventsWithArticles } from "@cobalt-web/server-data/news/events/queries";
import {
  eventsQuerySchema,
  eventsResponseSchema,
} from "@cobalt-web/server-data/news/events/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description:
    "Cursor-paginated list of financial events with grouped articles",
  method: "get",
  path: "/events",
  request: {
    query: eventsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: eventsResponseSchema,
        },
      },
      description: "Paginated financial events",
    },
  },
  summary: "List financial events",
  tags: ["News"],
});

export const eventsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { limit, cursor, topic } = c.req.valid("query");

    const result = await getFinancialEventsWithArticles(
      c.var.user.id,
      limit,
      cursor,
      topic
    );

    c.header("Cache-Control", "private, max-age=60");

    return c.json(result, 200);
  }
);
