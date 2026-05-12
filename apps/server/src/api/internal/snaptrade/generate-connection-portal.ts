import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { generateConnectionPortal } from "@cobalt-web/server-data/providers/snaptrade/auth/actions";
import {
  connectionPortalResponseSchema,
  generatePortalQuerySchema,
} from "@cobalt-web/server-data/providers/snaptrade/auth/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/generateConnectionPortal",
  request: {
    body: {
      content: {
        "application/json": { schema: generatePortalQuerySchema },
      },
    },
  },
  responses: {
    200: jsonContent(connectionPortalResponseSchema, "Connection portal URL"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(generatePortalQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "SnapTrade upstream failed"),
  },
  summary: "Generate SnapTrade connection portal URL",
  tags: ["SnapTrade"],
});

export const generateConnectionPortalRouter = createApp().openapi(route, async (c) => {
  const { broker, reconnectAuthorizationId } = c.req.valid("json");
  const result = await generateConnectionPortal(c.var.user.id, broker, reconnectAuthorizationId);
  return c.json(result, 200);
});
