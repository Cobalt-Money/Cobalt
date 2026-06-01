import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  FREE_LIMITS,
  getUserSubscriptionState,
  rankConnectionsByCreatedAt,
  subscriptionStatusResponseSchema,
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
  const [state, ranked] = await Promise.all([
    getUserSubscriptionState(c.var.user.id),
    rankConnectionsByCreatedAt(c.var.user.id),
  ]);
  const cap = state.tier === "pro" ? Number.POSITIVE_INFINITY : FREE_LIMITS.connections;
  const connectionStates = ranked.map((r, idx) => ({
    externalId: r.externalId,
    frozen: idx >= cap,
    id: r.id,
    kind: r.kind,
  }));
  c.header("Cache-Control", "private, no-store");
  return c.json(
    subscriptionStatusResponseSchema.parse({
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      connectionStates,
      hasActiveSubscription: state.source !== null,
      periodEnd: state.periodEnd ? state.periodEnd.toISOString() : null,
      status: state.status,
      subscriptionSource: state.source,
      tier: state.tier,
    }),
    200,
  );
});
