import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getActiveAlerts } from "@cobalt-web/server-data/alerts/queries";
import { alertListResponseSchema } from "@cobalt-web/server-data/alerts/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: jsonContent(alertListResponseSchema, "Active alerts for the signed-in user"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List active user alerts",
  tags: ["Alerts"],
});

export const alertsRouter = createApp().openapi(list, async (c) => {
  const alerts = await getActiveAlerts(c.var.user.id);
  c.header("Cache-Control", "private, max-age=30");
  return c.json(alertListResponseSchema.parse({ alerts }), 200);
});
