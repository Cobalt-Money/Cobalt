import { getFinancialEventDetails } from "@cobalt-web/server-data/news/detail/queries";
import {
  eventDetailResponseSchema,
  eventIdParamSchema,
  eventNotFoundSchema,
} from "@cobalt-web/server-data/news/detail/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/events/{eventId}",
  request: { params: eventIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: eventDetailResponseSchema },
      },
      description: "Event details",
    },
    404: {
      content: {
        "application/json": { schema: eventNotFoundSchema },
      },
      description: "Event not found",
    },
  },
  summary: "Get event details",
  tags: ["News"],
});

export const eventDetailRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { eventId } = c.req.valid("param");
    const event = await getFinancialEventDetails(c.var.user.id, eventId);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    c.header("Cache-Control", "private, max-age=60");
    return c.json({ event }, 200);
  }
);
