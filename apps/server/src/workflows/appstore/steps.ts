import { applyMobileSubscriptionWebhookUpdate } from "@cobalt-web/server-data/subscriptions/mutations";
import type {
  MobileSubscriptionWebhookUpdateSet,
  NotificationType,
  WebhookTransactionInfo,
  WebhookUpdateResult,
} from "@cobalt-web/server-data/subscriptions/mutations";
import { findMobileSubscriptionByOriginalTransactionId } from "@cobalt-web/server-data/subscriptions/queries";
import { RetryableError } from "workflow";

import { notificationTypeToSubscriptionStatus } from "./lib";

// Superwall webhook URL for event forwarding
const SUPERWALL_WEBHOOK_URL =
  "https://superwall.com/api/integrations/app-store-connect/webhook?pk=pk_e8ead6322fdffe21e3281a5ede454f2ed70b9d3671f48ea9";

export interface AppStoreWebhookParams {
  // Raw body to forward to Superwall
  rawBody: unknown;
  // Parsed notification data
  notificationType: NotificationType;
  subtype?: string;
  // Transaction info (may be null for some notification types)
  transactionInfo?: WebhookTransactionInfo;
}

/**
 * Step: Forward the notification to Superwall
 * Retries on network errors, but doesn't fail the workflow if Superwall is unreachable
 */
export async function forwardToSuperwallStep(rawBody: unknown): Promise<{
  success: boolean;
  message: string;
}> {
  "use step";

  try {
    const response = await fetch(SUPERWALL_WEBHOOK_URL, {
      body: JSON.stringify(rawBody),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    });

    if (response.ok) {
      return { message: "Forwarded to Superwall", success: true };
    }

    // Non-OK response - check if retryable
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableError(`Superwall returned ${response.status}`, {
        retryAfter: "30s",
      });
    }

    // Client error (4xx except 429) - don't retry

    return {
      message: `Superwall returned ${response.status}`,
      success: false,
    };
  } catch (error) {
    // Network errors are retryable
    if (error instanceof RetryableError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("fetch"))
    ) {
      throw new RetryableError(`Network error: ${error.message}`, {
        retryAfter: "30s",
      });
    }

    // Unknown errors - log and continue (don't fail workflow)

    return {
      message: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Step: Update subscription status in database
 * Delegates to server-data mutation using relational query patterns.
 */
export async function updateSubscriptionStep(params: {
  notificationType: NotificationType;
  transactionInfo: WebhookTransactionInfo;
}): Promise<WebhookUpdateResult> {
  "use step";

  try {
    const { notificationType, transactionInfo } = params;
    const {
      originalTransactionId,
      transactionId,
      productId,
      expiresDate,
      environment,
    } = transactionInfo;

    const existingRecord = await findMobileSubscriptionByOriginalTransactionId(
      originalTransactionId
    );

    if (!existingRecord) {
      return {
        message: "Subscription not found, may need to be synced via app",
        success: true,
      };
    }

    const now = new Date();
    const expiresAt = expiresDate ? new Date(expiresDate) : null;
    const newStatus = notificationTypeToSubscriptionStatus(
      notificationType,
      existingRecord.status
    );

    const set: MobileSubscriptionWebhookUpdateSet = {
      environment,
      expiresAt,
      latestTransactionId: transactionId,
      productId,
      status: newStatus,
      updatedAt: now,
    };

    await applyMobileSubscriptionWebhookUpdate(originalTransactionId, set);

    return {
      message: `Updated subscription status to ${newStatus}`,
      newStatus,
      success: true,
    };
  } catch (error) {
    // Convert transient database errors to retryable
    if (
      error instanceof Error &&
      (error.message.includes("connection") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNREFUSED"))
    ) {
      throw new RetryableError(`Database error: ${error.message}`, {
        retryAfter: "10s",
      });
    }

    throw error;
  }
}
