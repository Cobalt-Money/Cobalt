import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertBrokerageAccountOwnedByExternalId } from "@cobalt-web/server-data/brokerage/errors";
import { getPositionsByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  positionsQuerySchema,
  positionsResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/positions",
  request: { query: positionsQuerySchema },
  responses: {
    200: jsonContent(positionsResponseSchema, "Brokerage positions"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Brokerage account not found"),
    422: validationErrorResponse(positionsQuerySchema),
  },
  summary: "Get brokerage positions",
  tags: ["Brokerage"],
});

export const positionsRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  if (query.accountId) {
    await assertBrokerageAccountOwnedByExternalId(query.accountId, c.var.user.id);
  }
  const result = await getPositionsByUserId(c.var.user.id, query);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
