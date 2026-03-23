import {
  subscriptionStatusResponseSchema,
  userHasActiveSubscription,
} from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description:
    "Check whether the authenticated user has an active subscription",
  method: "get",
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

export const statusRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const hasActiveSubscription = await userHasActiveSubscription(
      c.var.user.id
    );
    c.header("Cache-Control", "private, no-store");
    return c.json({ hasActiveSubscription }, 200);
  }
);
