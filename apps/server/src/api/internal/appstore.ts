import {
  appStoreSyncBodySchema,
  appStoreSyncErrorSchema,
  appStoreSyncResponseSchema,
  syncAppStoreSubscription,
} from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "./middleware.js";

const syncRoute = createRoute({
  description:
    "Persist App Store subscription data after StoreKit reports a purchase. Does not require an existing subscription (users who just bought must be able to sync).",
  method: "post",
  path: "/sync",
  request: {
    body: {
      content: { "application/json": { schema: appStoreSyncBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: appStoreSyncResponseSchema },
      },
      description: "Subscription created or updated",
    },
    400: {
      content: {
        "application/json": { schema: appStoreSyncErrorSchema },
      },
      description: "Invalid body or dates",
    },
    401: {
      content: {
        "application/json": { schema: appStoreSyncErrorSchema },
      },
      description: "Unauthorized",
    },
    500: {
      content: {
        "application/json": { schema: appStoreSyncErrorSchema },
      },
      description: "Server error",
    },
  },
  summary: "Sync App Store subscription (StoreKit)",
  tags: ["App Store"],
});

const syncRouter = new OpenAPIHono<AppEnv>();

syncRouter.openapi(syncRoute, async (c) => {
  const body = c.req.valid("json");
  const userId = c.var.user.id;

  try {
    const result = await syncAppStoreSubscription(userId, {
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
      200
    );
  } catch (error) {
    if (error instanceof TypeError) {
      return c.json({ error: error.message || "Invalid request" }, 400);
    }
    return c.json(
      {
        details: error instanceof Error ? error.message : "Unknown error",
        error: "Failed to sync subscription",
      },
      500
    );
  }
});

export const appstoreRouter = new OpenAPIHono<AppEnv>()
  .use("/*", requireAuth)
  .route("/", syncRouter);
