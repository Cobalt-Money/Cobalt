import { getUserBrokeragesByUserId } from "@cobalt-web/server-data/brokerage/queries";
import { userBrokeragesResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/user-brokerages",
  responses: {
    200: jsonContent(userBrokeragesResponseSchema, "List of connected brokerage names"),
  },
  summary: "Get user brokerages",
  tags: ["Brokerage"],
});

export const userBrokeragesRouter = createApp().openapi(route, async (c) => {
  const data = await getUserBrokeragesByUserId(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json({ data }, 200);
});
