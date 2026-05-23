import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getPositions,
  positionsQuerySchema,
  positionsResponseSchema,
} from "@cobalt-web/server-data/brokerage/positions";
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
    422: validationErrorResponse(positionsQuerySchema),
  },
  summary: "Get brokerage positions",
  tags: ["Brokerage"],
});

export const positionsRouter = createApp().openapi(route, async (c) => {
  // Ownership inlined in WHERE — non-owners receive an empty list.
  const result = await getPositions(c.var.user.id, c.req.valid("query"));
  c.header("Cache-Control", "private, max-age=60");
  return c.json(positionsResponseSchema.parse(result), 200);
});
