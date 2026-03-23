import { z } from "@hono/zod-openapi";

export const subscriptionStatusResponseSchema = z.object({
  hasActiveSubscription: z.boolean(),
});

export const billingPortalResponseSchema = z.object({
  url: z.string(),
});
