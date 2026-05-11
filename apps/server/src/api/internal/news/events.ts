import { getFinancialEventsWithArticles } from "@cobalt-web/server-data/news/events/queries";
import {
  eventsQuerySchema,
  eventsResponseSchema,
} from "@cobalt-web/server-data/news/events/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Cursor-paginated list of financial events with grouped articles",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/events",
  request: {
    query: eventsQuerySchema,
  },
  responses: {
    200: jsonContent(eventsResponseSchema, "Paginated financial events"),
    422: validationErrorResponse(eventsQuerySchema),
  },
  summary: "List financial events",
  tags: ["News"],
});

export const eventsRouter = createApp().openapi(route, async (c) => {
  const { limit, cursor, topic } = c.req.valid("query");

  const result = await getFinancialEventsWithArticles(c.var.user.id, limit, cursor, topic);

  c.header("Cache-Control", "private, max-age=60");

  return c.json(result, 200);
});
