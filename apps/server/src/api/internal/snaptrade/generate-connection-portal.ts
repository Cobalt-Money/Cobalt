import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { generateConnectionPortal } from "@cobalt-web/server-data/providers/snaptrade/auth/actions";
import {
  connectionPortalResponseSchema,
  generatePortalQuerySchema,
} from "@cobalt-web/server-data/providers/snaptrade/auth/schemas";
import { userCanAddConnection } from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth, requireNotDemo } from "../middleware.js";

const route = createRoute({
  method: "post",
  middleware: [requireAuth, requireNotDemo] as const,
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
    402: jsonContent(
      errorResponseWithCodeSchema,
      "Free-tier connection limit reached — upgrade required",
    ),
    422: validationErrorResponse(generatePortalQuerySchema),
    502: jsonContent(errorResponseWithCodeSchema, "SnapTrade upstream failed"),
  },
  summary: "Generate SnapTrade connection portal URL",
  tags: ["SnapTrade"],
});

export const generateConnectionPortalRouter = createApp().openapi(route, async (c) => {
  const { broker, reconnectAuthorizationId } = c.req.valid("json");
  const userId = c.var.user.id;

  // Reconnect reuses an existing authorization — does not grow the pool.
  // Only new-connection flow is gated by the free-tier limit.
  if (!reconnectAuthorizationId && !(await userCanAddConnection(userId))) {
    return c.json(
      {
        code: "connection_limit_reached",
        error: "Free tier allows 1 synced connection. Upgrade to Pro for unlimited.",
      },
      402,
    );
  }

  const result = await generateConnectionPortal(userId, broker, reconnectAuthorizationId);
  return c.json(result, 200);
});
