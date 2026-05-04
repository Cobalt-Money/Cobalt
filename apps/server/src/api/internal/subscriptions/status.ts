import {
  subscriptionStatusResponseSchema,
  userSubscriptionSource,
} from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  description: "Check whether the authenticated user has an active subscription",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": { schema: subscriptionStatusResponseSchema },
      },
      description: "Subscription status",
    },
  },
  summary: "Get subscription status",
  tags: ["Subscriptions"],
});

export const statusRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const source = await userSubscriptionSource(c.var.user.id);
  c.header("Cache-Control", "private, no-store");
  return c.json(
    {
      hasActiveSubscription: source !== null,
      subscriptionSource: source,
    },
    200,
  );
});
