import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  appStoreSyncResponseSchema,
  syncAppStoreSubscription,
  syncAppStoreSubscriptionSchema,
} from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../lib/openapi-helpers.js";
import { requireAuth } from "./middleware.js";

const syncRoute = createRoute({
  deprecated: true,
  description:
    "DEPRECATED: iOS migrated to Stripe-only paywall (SRI-102). Legacy StoreKit clients may still call this; receives no traffic from current builds. Slated for removal after two releases of zero hits — see issue #364. Persists App Store subscription data after StoreKit reports a purchase.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sync",
  request: {
    body: {
      content: {
        "application/json": { schema: syncAppStoreSubscriptionSchema },
      },
    },
  },
  responses: {
    200: jsonContent(appStoreSyncResponseSchema, "Subscription created or updated"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid body or dates"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(syncAppStoreSubscriptionSchema),
    502: jsonContent(errorResponseWithCodeSchema, "App Store upstream failed"),
  },
  summary: "Sync App Store subscription (StoreKit)",
  tags: ["App Store"],
});

export const appstoreRouter = createApp().openapi(syncRoute, async (c) => {
  // Deprecation telemetry: log every hit so we can confirm zero traffic before hard-deletion (#364).
  console.warn("[deprecated] /api/appstore/sync called", {
    userId: c.var.user.id,
  });
  const body = c.req.valid("json");
  const result = await syncAppStoreSubscription(c.var.user.id, {
    environment: body.environment,
    expiresAt: body.expiresAt,
    latestTransactionId: body.latestTransactionId,
    originalTransactionId: body.originalTransactionId,
    productId: body.productId,
  });

  return c.json(
    appStoreSyncResponseSchema.parse({
      action: result.action,
      subscriptionId: result.subscriptionId,
      success: true as const,
    }),
    200,
  );
});
