import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  activitiesQuerySchema,
  activitiesResponseSchema,
  getActivities,
} from "@cobalt-web/server-data/brokerage/activities";
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
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(activitiesQuerySchema),
  },
  summary: "Get brokerage activities",
  tags: ["Brokerage"],
});

export const activitiesRouter = createApp().openapi(route, async (c) => {
  // Ownership inlined in WHERE — non-owners receive an empty list.
  const result = await getActivities(c.var.user.id, c.req.valid("query"));
  c.header("Cache-Control", "private, max-age=60");
  return c.json(activitiesResponseSchema.parse(result), 200);
});
