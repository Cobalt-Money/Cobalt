import { generateConnectionPortal } from "@cobalt-web/server-data/providers/snaptrade/auth/actions";
import {
  connectionPortalResponseSchema,
  errorResponseSchema,
  generatePortalQuerySchema,
} from "@cobalt-web/server-data/providers/snaptrade/auth/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

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
    200: {
      content: {
        "application/json": { schema: connectionPortalResponseSchema },
      },
      description: "Connection portal URL",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Generate SnapTrade connection portal URL",
  tags: ["SnapTrade"],
});

export const generateConnectionPortalRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { broker, reconnectAuthorizationId } = c.req.valid("json");

    try {
      const result = await generateConnectionPortal(
        c.var.user.id,
        broker,
        reconnectAuthorizationId
      );
      return c.json(result, 200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error generating connection portal";
      return c.json({ error: message }, 500);
    }
  }
);
