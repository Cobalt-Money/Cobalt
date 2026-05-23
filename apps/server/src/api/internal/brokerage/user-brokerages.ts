import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getUserBrokerages,
  userBrokeragesResponseSchema,
} from "@cobalt-web/server-data/brokerage/user-brokerages";
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
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Get user brokerages",
  tags: ["Brokerage"],
});

export const userBrokeragesRouter = createApp().openapi(route, async (c) => {
  const data = await getUserBrokerages(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(userBrokeragesResponseSchema.parse({ data }), 200);
});
