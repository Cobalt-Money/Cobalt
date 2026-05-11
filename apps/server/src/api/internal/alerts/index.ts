import { getActiveAlerts } from "@cobalt-web/server-data/alerts/queries";
import { alertListResponseSchema } from "@cobalt-web/server-data/alerts/schemas";
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

export const alertsRouter = new OpenAPIHono<AppEnv>().openapi(list, async (c) => {
  const alerts = await getActiveAlerts(c.var.user.id);
  c.header("Cache-Control", "private, max-age=30");
  return c.json({ alerts }, 200);
});
