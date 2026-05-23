import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  subscriptionStatusResponseSchema,
  userSubscriptionSource,
} from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  description: "Check whether the authenticated user has an active subscription",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: jsonContent(subscriptionStatusResponseSchema, "Subscription status"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Get subscription status",
  tags: ["Subscriptions"],
});

export const statusRouter = createApp().openapi(route, async (c) => {
  const source = await userSubscriptionSource(c.var.user.id);
  c.header("Cache-Control", "private, no-store");
  return c.json(
    subscriptionStatusResponseSchema.parse({
      hasActiveSubscription: source !== null,
      subscriptionSource: source,
    }),
    200,
  );
});
