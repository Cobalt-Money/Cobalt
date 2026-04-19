import { env } from "@cobalt-web/env/server";
import {
  billingPortalResponseSchema,
  createBillingPortalSession,
} from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  description:
    "Create a Stripe billing portal session for the authenticated user",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/billingPortal",
  responses: {
    200: {
      content: {
        "application/json": { schema: billingPortalResponseSchema },
      },
      description: "Billing portal URL",
    },
  },
  summary: "Create billing portal session",
  tags: ["Subscriptions"],
});

export const billingPortalRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const appUrl = env.APP_URL;
    const url = await createBillingPortalSession(
      c.var.user.id,
      `${appUrl}/settings`
    );
    return c.json({ url }, 200);
  }
);
