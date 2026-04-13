import { mobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";

export const subscriptionStatusResponseSchema = z.object({
  hasActiveSubscription: z.boolean(),
  /** "stripe" | "appstore" | null — null means no active subscription. */
  subscriptionSource: z.enum(["stripe", "appstore"]).nullable(),
});

export const billingPortalResponseSchema = z.object({
  url: z.string(),
});

// ── App Store sync: derived from `mobile_subscription` columns ───────────────

const mobileSubscriptionInsertSchema = createInsertSchema(mobileSubscription);
const mobileSubscriptionRowSchema = createSelectSchema(mobileSubscription);

/** POST body: insert subset + ISO string for `expiresAt` (wire vs `timestamp`). */
export const appStoreSyncBodySchema = mobileSubscriptionInsertSchema
  .pick({
    environment: true,
    expiresAt: true,
    latestTransactionId: true,
    originalTransactionId: true,
    productId: true,
  })
  .extend({
    environment: z.enum(["Production", "Sandbox"]).default("Production"),
    expiresAt: z
      .string()
      .min(1)
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "expiresAt must be a valid ISO 8601 date string",
      }),
  });

/** Parsed App Store sync payload (after Zod). */
export type AppStoreSyncInput = z.infer<typeof appStoreSyncBodySchema>;

export const appStoreSyncResponseSchema = z
  .object({
    action: z.enum(["created", "transferred", "updated"]),
    success: z.literal(true),
  })
  .extend({
    subscriptionId: mobileSubscriptionRowSchema.shape.id,
  });

export type AppStoreSyncMutationResult = Pick<
  z.infer<typeof appStoreSyncResponseSchema>,
  "action" | "subscriptionId"
>;

export const appStoreSyncErrorSchema = z.object({
  details: z.string().optional(),
  error: z.string(),
});
