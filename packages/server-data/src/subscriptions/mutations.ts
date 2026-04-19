import { db } from "@cobalt-web/db";
import { mobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";
import { eq } from "drizzle-orm";

import type {
  AppStoreNotificationInput,
  AppStoreNotificationResult,
  AppStoreSyncInput,
  AppStoreSyncMutationResult,
} from "./schemas.js";

/**
 * Upserts an App Store subscription after StoreKit reports a purchase.
 * Does not require an existing subscription row (chicken-and-egg safe).
 */
export async function syncAppStoreSubscription(
  userId: string,
  input: AppStoreSyncInput
): Promise<AppStoreSyncMutationResult> {
  const now = new Date();
  let expiresAt = new Date(input.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new TypeError("Invalid expiresAt");
  }

  // Sandbox: Apple may send stale expiration times on re-purchase; treat sync as fresh.
  if (input.environment === "Sandbox" && expiresAt <= now) {
    expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  }

  const status = expiresAt > now ? "active" : "expired";
  const { environment } = input;
  const latestTransactionId =
    input.latestTransactionId ?? input.originalTransactionId;

  const existing = await db
    .select()
    .from(mobileSubscription)
    .where(
      eq(mobileSubscription.originalTransactionId, input.originalTransactionId)
    )
    .limit(1);

  const [existingRecord] = existing;
  if (existingRecord) {
    await db
      .update(mobileSubscription)
      .set({
        environment,
        expiresAt,
        latestTransactionId,
        productId: input.productId,
        status,
        updatedAt: now,
        userId,
      })
      .where(
        eq(
          mobileSubscription.originalTransactionId,
          input.originalTransactionId
        )
      );

    return {
      action: existingRecord.userId === userId ? "updated" : "transferred",
      subscriptionId: existingRecord.id,
    };
  }

  const [row] = await db
    .insert(mobileSubscription)
    .values({
      createdAt: now,
      environment,
      expiresAt,
      id: crypto.randomUUID(),
      latestTransactionId,
      originalTransactionId: input.originalTransactionId,
      productId: input.productId,
      status,
      updatedAt: now,
      userId,
    })
    .onConflictDoUpdate({
      set: {
        environment,
        expiresAt,
        latestTransactionId,
        productId: input.productId,
        status,
        updatedAt: now,
        userId,
      },
      target: mobileSubscription.originalTransactionId,
    })
    .returning({ id: mobileSubscription.id });

  if (!row) {
    throw new Error("Failed to upsert mobile subscription");
  }

  return {
    action: "created",
    subscriptionId: row.id,
  };
}

/**
 * Applies an App Store Server Notification V2 event to `mobile_subscription`.
 *
 * We don't create rows here — the app's StoreKit handler calls `syncAppStoreSubscription`
 * on purchase, which is the one place we know the `userId`. The webhook updates the
 * status of a row that already exists. If the notification arrives before the sync
 * (edge case: purchase completes, app backgrounds before calling `/api/appstore/sync`),
 * we skip and let the next sync catch up.
 */
export async function applyAppStoreNotification(
  input: AppStoreNotificationInput
): Promise<AppStoreNotificationResult> {
  const {
    environment,
    expiresAt,
    latestTransactionId,
    notificationType,
    originalTransactionId,
    productId,
  } = input;

  const existing = await db
    .select()
    .from(mobileSubscription)
    .where(eq(mobileSubscription.originalTransactionId, originalTransactionId))
    .limit(1);

  const [record] = existing;
  if (!record) {
    return { action: "skipped", reason: "subscription_not_found" };
  }

  const nextStatus = mapNotificationToStatus(notificationType, record.status);

  const update: Partial<typeof mobileSubscription.$inferInsert> = {
    status: nextStatus,
    updatedAt: new Date(),
  };
  if (productId) {
    update.productId = productId;
  }
  if (environment) {
    update.environment = environment;
  }
  if (expiresAt) {
    update.expiresAt = expiresAt;
  }
  if (latestTransactionId) {
    update.latestTransactionId = latestTransactionId;
  }

  await db
    .update(mobileSubscription)
    .set(update)
    .where(eq(mobileSubscription.originalTransactionId, originalTransactionId));

  return {
    action: "updated",
    status: nextStatus,
    subscriptionId: record.id,
  };
}

function mapNotificationToStatus(
  notificationType: AppStoreNotificationInput["notificationType"],
  currentStatus: string
): string {
  switch (notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW":
    case "RENEWAL_EXTENDED":
    case "OFFER_REDEEMED": {
      return "active";
    }
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED": {
      return "expired";
    }
    case "DID_FAIL_TO_RENEW": {
      return "billing_retry";
    }
    case "REFUND":
    case "REVOKE": {
      return "cancelled";
    }
    default: {
      // DID_CHANGE_RENEWAL_STATUS, PRICE_INCREASE, CONSUMPTION_REQUEST, etc.
      // leave the status untouched — these are informational.
      return currentStatus;
    }
  }
}
