import { getFinancialEventDetails } from "@cobalt-web/server-data/news/detail/queries";
import {
  eventDetailResponseSchema,
  eventIdParamSchema,
  eventNotFoundSchema,
} from "@cobalt-web/server-data/news/detail/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/events/{eventId}",
  request: { params: eventIdParamSchema },
  responses: {
    200: jsonContent(eventDetailResponseSchema, "Event details"),
    404: jsonContent(eventNotFoundSchema, "Event not found"),
    422: validationErrorResponse(eventIdParamSchema),
  },
  summary: "Get event details",
  tags: ["News"],
});

export const eventDetailRouter = createApp().openapi(route, async (c) => {
  const { eventId } = c.req.valid("param");
  const event = await getFinancialEventDetails(c.var.user.id, eventId);

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  c.header("Cache-Control", "private, max-age=60");
  return c.json({ event }, 200);
});
