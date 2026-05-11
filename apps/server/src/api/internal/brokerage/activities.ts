import { getActivitiesByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  activitiesQuerySchema,
  activitiesResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/activities",
  request: { query: activitiesQuerySchema },
  responses: {
    200: jsonContent(activitiesResponseSchema, "Brokerage activities"),
    422: validationErrorResponse(activitiesQuerySchema),
  },
  summary: "Get brokerage activities",
  tags: ["Brokerage"],
});

export const activitiesRouter = createApp().openapi(route, async (c) => {
  const result = await getActivitiesByUserId(c.var.user.id, c.req.valid("query"));
  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
