import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  appStoreSyncBodySchema,
  appStoreSyncResponseSchema,
  syncAppStoreSubscription,
} from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../lib/openapi-helpers.js";
import { requireAuth } from "./middleware.js";

const syncRoute = createRoute({
  description:
    "Persist App Store subscription data after StoreKit reports a purchase. Does not require an existing subscription (users who just bought must be able to sync).",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sync",
  request: {
    body: {
      content: { "application/json": { schema: appStoreSyncBodySchema } },
    },
  },
  responses: {
    200: jsonContent(appStoreSyncResponseSchema, "Subscription created or updated"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid body or dates"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(appStoreSyncBodySchema),
    502: jsonContent(errorResponseWithCodeSchema, "App Store upstream failed"),
  },
  summary: "Sync App Store subscription (StoreKit)",
  tags: ["App Store"],
});

export const appstoreRouter = createApp().openapi(syncRoute, async (c) => {
  const body = c.req.valid("json");
  const result = await syncAppStoreSubscription(c.var.user.id, {
    environment: body.environment,
    expiresAt: body.expiresAt,
    latestTransactionId: body.latestTransactionId,
    originalTransactionId: body.originalTransactionId,
    productId: body.productId,
  });

  return c.json(
    {
      action: result.action,
      subscriptionId: result.subscriptionId,
      success: true as const,
    },
    200,
  );
});
