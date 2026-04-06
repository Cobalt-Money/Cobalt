import {
  deriveStoreKitSyncFields,
  insertMobileSubscriptionFromStoreKitSync,
  updateMobileSubscriptionFromStoreKitSync,
} from "@cobalt-web/server-data/subscriptions/mutations";
import { findMobileSubscriptionByOriginalTransactionId } from "@cobalt-web/server-data/subscriptions/queries";
import {
  appStoreSyncBodySchema,
  appStoreSyncErrorSchema,
  appStoreSyncResponseSchema,
} from "@cobalt-web/server-data/subscriptions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

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

export const syncRouter = new OpenAPIHono<AppEnv>();

syncRouter.openapi(syncRoute, async (c) => {
  const body = c.req.valid("json");
  const userId = c.var.user.id;

  try {
    const now = new Date();
    const fields = deriveStoreKitSyncFields(now, body);

    const existing = await findMobileSubscriptionByOriginalTransactionId(
      body.originalTransactionId
    );

    if (existing) {
      await updateMobileSubscriptionFromStoreKitSync(
        body.originalTransactionId,
        {
          environment: fields.environment,
          expiresAt: fields.expiresAt,
          latestTransactionId: fields.latestTransactionId,
          productId: body.productId,
          status: fields.status,
          updatedAt: now,
          userId,
        }
      );

      return c.json(
        {
          action:
            existing.userId === userId
              ? ("updated" as const)
              : ("transferred" as const),
          subscriptionId: existing.id,
          success: true as const,
        },
        200
      );
    }

    const row = await insertMobileSubscriptionFromStoreKitSync({
      createdAt: now,
      environment: fields.environment,
      expiresAt: fields.expiresAt,
      latestTransactionId: fields.latestTransactionId,
      originalTransactionId: body.originalTransactionId,
      productId: body.productId,
      status: fields.status,
      updatedAt: now,
      userId,
    });

    return c.json(
      {
        action: "created" as const,
        subscriptionId: row.id,
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
