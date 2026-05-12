import { env } from "@cobalt-web/env/server";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  billingPortalResponseSchema,
  createBillingPortalSession,
} from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  description: "Create a Stripe billing portal session for the authenticated user",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/billingPortal",
  responses: {
    200: jsonContent(billingPortalResponseSchema, "Billing portal URL"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    409: jsonContent(errorResponseWithCodeSchema, "User has no Stripe customer"),
    502: jsonContent(errorResponseWithCodeSchema, "Stripe upstream failed"),
  },
  summary: "Create billing portal session",
  tags: ["Subscriptions"],
});

export const billingPortalRouter = createApp().openapi(route, async (c) => {
  const appUrl = env.APP_URL;
  const url = await createBillingPortalSession(c.var.user.id, `${appUrl}/settings`);
  return c.json({ url }, 200);
});
