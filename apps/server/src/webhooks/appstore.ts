import {
  AppStoreVerificationError,
  verifyAppStoreNotification,
} from "@cobalt-web/server-data/subscriptions";
import { Hono } from "hono";
import { start } from "workflow/api";

import { appstoreWebhookWorkflow } from "../workflows/appstore/workflow.js";

/**
 * App Store Server Notifications V2 webhook.
 *
 * Configure in App Store Connect → App Information → App Store Server
 * Notifications (Version 2): `https://api.cobaltpf.com/webhooks/appstore`.
 *
 * @see https://developer.apple.com/documentation/appstoreservernotifications
 */

interface SignedPayloadBody {
  signedPayload?: unknown;
}

export const appstoreWebhookRouter = new Hono().post("/", async (c) => {
  let body: SignedPayloadBody;
  try {
    body = (await c.req.json()) as SignedPayloadBody;
  } catch (error) {
    console.error("[appstore] Invalid JSON body:", error);
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { signedPayload } = body;
  if (typeof signedPayload !== "string" || signedPayload.length === 0) {
    console.error("[appstore] Missing signedPayload");
    return c.json({ error: "Missing signedPayload" }, 400);
  }

  try {
    const { notificationType, subtype, transaction } =
      await verifyAppStoreNotification(signedPayload);

    console.log(
      `[appstore] Received ${notificationType}${subtype ? ` (${subtype})` : ""}`
    );

    if (notificationType === "TEST") {
      return c.json({ notificationType, status: "ok" });
    }

    if (!transaction) {
      return c.json({ notificationType, status: "no_transaction_info" });
    }

    await start(appstoreWebhookWorkflow, [
      {
        environment: transaction.environment,
        expiresAt: transaction.expiresAt,
        latestTransactionId: transaction.transactionId,
        notificationType,
        originalTransactionId: transaction.originalTransactionId,
        productId: transaction.productId,
      },
    ]);
    console.log(
      `[appstore] Triggered workflow for ${notificationType} (originalTransactionId=${transaction.originalTransactionId})`
    );

    return c.json({ notificationType, status: "processing" });
  } catch (error) {
    if (error instanceof AppStoreVerificationError) {
      console.error(`[appstore] Verification failed: ${error.message}`);
      return c.json({ error: "Signature verification failed" }, 401);
    }
    console.error("[appstore] Webhook processing error:", error);
    // Return 200 so Apple doesn't retry indefinitely on our bugs.
    return c.json({
      error: error instanceof Error ? error.message : "Unknown error",
      status: "error",
    });
  }
});
