import { db } from "@cobalt-web/db";
import { mobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";
import { eq } from "drizzle-orm";

import type {
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
