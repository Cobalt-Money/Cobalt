import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertBrokerageAccountOwnedByExternalId } from "@cobalt-web/server-data/brokerage/errors";
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
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Brokerage account not found"),
    422: validationErrorResponse(activitiesQuerySchema),
  },
  summary: "Get brokerage activities",
  tags: ["Brokerage"],
});

export const activitiesRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  if (query.accountId) {
    await assertBrokerageAccountOwnedByExternalId(query.accountId, c.var.user.id);
  }
  const result = await getActivitiesByUserId(c.var.user.id, query);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
