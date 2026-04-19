import { successResponseSchema } from "@cobalt-web/server-data/accounts/schemas";
import { dismissAlert } from "@cobalt-web/server-data/alerts/mutations";
import { getActiveAlerts } from "@cobalt-web/server-data/alerts/queries";
import {
  alertIdParamSchema,
  alertListResponseSchema,
} from "@cobalt-web/server-data/alerts/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: alertListResponseSchema } },
      description: "Active alerts for the signed-in user",
    },
  },
  summary: "List active user alerts",
  tags: ["Alerts"],
});

const dismiss = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/dismiss",
  request: { params: alertIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Alert dismissed",
    },
    404: { description: "Alert not found" },
  },
  summary: "Dismiss a user alert",
  tags: ["Alerts"],
});

export const alertsRouter = new OpenAPIHono<AppEnv>()
  .openapi(list, async (c) => {
    const alerts = await getActiveAlerts(c.var.user.id);
    c.header("Cache-Control", "private, max-age=30");
    return c.json({ alerts }, 200);
  })
  .openapi(dismiss, async (c) => {
    const { id } = c.req.valid("param");
    const result = await dismissAlert(c.var.user.id, id);
    if (!result.success) {
      return c.json({ error: result.message ?? "Alert not found" }, 404);
    }
    return c.json({ success: true }, 200);
  });
