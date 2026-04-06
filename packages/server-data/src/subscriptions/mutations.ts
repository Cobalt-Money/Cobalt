import { db } from "@cobalt-web/db";
import { mobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";
import { eq } from "drizzle-orm";

import type { AppStoreSyncInput } from "./schemas.js";

export interface StoreKitSyncDerivedFields {
  environment: "Production" | "Sandbox";
  expiresAt: Date;
  latestTransactionId: string;
  status: string;
}

/**
 * Parses wire `expiresAt`, applies sandbox re-purchase bump, derives status and ids.
 */
export function deriveStoreKitSyncFields(
  now: Date,
  input: AppStoreSyncInput
): StoreKitSyncDerivedFields {
  let expiresAt = new Date(input.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new TypeError("Invalid expiresAt");
  }

  // Sandbox: Apple may send stale expiration times on re-purchase; treat sync as fresh.
  if (input.environment === "Sandbox" && expiresAt <= now) {
    expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  }

  const status = expiresAt > now ? "active" : "expired";
  const latestTransactionId =
    input.latestTransactionId ?? input.originalTransactionId;

  return {
    environment: input.environment,
    expiresAt,
    latestTransactionId,
    status,
  };
}

interface StoreKitSyncWriteFields {
  environment: string;
  expiresAt: Date;
  latestTransactionId: string;
  productId: string;
  status: string;
  updatedAt: Date;
  userId: string;
}

export async function updateMobileSubscriptionFromStoreKitSync(
  originalTransactionId: string,
  fields: StoreKitSyncWriteFields
): Promise<void> {
  await db
    .update(mobileSubscription)
    .set({
      environment: fields.environment,
      expiresAt: fields.expiresAt,
      latestTransactionId: fields.latestTransactionId,
      productId: fields.productId,
      status: fields.status,
      updatedAt: fields.updatedAt,
      userId: fields.userId,
    })
    .where(eq(mobileSubscription.originalTransactionId, originalTransactionId));
}

export async function insertMobileSubscriptionFromStoreKitSync(args: {
  createdAt: Date;
  environment: string;
  expiresAt: Date;
  latestTransactionId: string;
  originalTransactionId: string;
  productId: string;
  status: string;
  updatedAt: Date;
  userId: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(mobileSubscription)
    .values({
      createdAt: args.createdAt,
      environment: args.environment,
      expiresAt: args.expiresAt,
      id: crypto.randomUUID(),
      latestTransactionId: args.latestTransactionId,
      originalTransactionId: args.originalTransactionId,
      productId: args.productId,
      status: args.status,
      updatedAt: args.updatedAt,
      userId: args.userId,
    })
    .onConflictDoUpdate({
      set: {
        environment: args.environment,
        expiresAt: args.expiresAt,
        latestTransactionId: args.latestTransactionId,
        productId: args.productId,
        status: args.status,
        updatedAt: args.updatedAt,
        userId: args.userId,
      },
      target: mobileSubscription.originalTransactionId,
    })
    .returning({ id: mobileSubscription.id });

  if (!row) {
    throw new Error("Failed to upsert mobile subscription");
  }

  return row;
}

// App Store Server Notification V2 types
export type NotificationType =
  | "SUBSCRIBED"
  | "DID_RENEW"
  | "EXPIRED"
  | "DID_FAIL_TO_RENEW"
  | "DID_CHANGE_RENEWAL_STATUS"
  | "REFUND"
  | "GRACE_PERIOD_EXPIRED"
  | "PRICE_INCREASE"
  | "CONSUMPTION_REQUEST"
  | "RENEWAL_EXTENDED"
  | "REVOKE"
  | "TEST"
  | "RENEWAL_EXTENSION"
  | "REFUND_DECLINED"
  | "REFUND_REVERSED";

export interface WebhookTransactionInfo {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  expiresDate?: number;
  environment: "Production" | "Sandbox";
}

export interface WebhookUpdateResult {
  success: boolean;
  message: string;
  newStatus?: string;
}

export interface MobileSubscriptionWebhookUpdateSet {
  environment: "Production" | "Sandbox";
  expiresAt: Date | null;
  latestTransactionId: string;
  productId: string;
  status: string;
  updatedAt: Date;
}

/**
 * Persists an App Store webhook subscription row update (single DB write).
 */
export async function applyMobileSubscriptionWebhookUpdate(
  originalTransactionId: string,
  set: MobileSubscriptionWebhookUpdateSet
): Promise<void> {
  await db
    .update(mobileSubscription)
    .set({
      environment: set.environment,
      expiresAt: set.expiresAt,
      latestTransactionId: set.latestTransactionId,
      productId: set.productId,
      status: set.status,
      updatedAt: set.updatedAt,
    })
    .where(eq(mobileSubscription.originalTransactionId, originalTransactionId));
}
