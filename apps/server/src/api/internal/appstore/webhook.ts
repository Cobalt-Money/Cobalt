import {
  SignedDataVerifier,
  Environment,
  VerificationException,
} from "@apple/app-store-server-library";
import type { NotificationType } from "@cobalt-web/server-data/subscriptions/mutations";
import { OpenAPIHono } from "@hono/zod-openapi";
import { start } from "workflow/api";

import type { AppStoreWebhookParams } from "@/workflows/appstore/steps";
import { appStoreWebhookWorkflow } from "@/workflows/appstore/workflow";

// Apple Root CA - G3 certificate (DER-encoded, base64)
const APPLE_ROOT_CA_G3_BASE64 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

const appleRootCert = Buffer.from(APPLE_ROOT_CA_G3_BASE64, "base64");

const appStoreEnv =
  process.env.APP_STORE_ENVIRONMENT === "Production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

const verifier = new SignedDataVerifier(
  [appleRootCert],
  true,
  appStoreEnv,
  "com.try-cobalt.Cobalt",
  appStoreEnv === Environment.PRODUCTION
    ? Number(process.env.APP_APPLE_ID)
    : undefined
);

export const appstoreWebhookRouter = new OpenAPIHono();

appstoreWebhookRouter.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const { signedPayload } = body;

    if (!signedPayload) {
      return c.json({ error: "Missing signedPayload" }, 400);
    }

    const cleanedPayload =
      typeof signedPayload === "string"
        ? signedPayload.trim().replaceAll(/\s+/g, "")
        : signedPayload;

    const payload = await verifier.verifyAndDecodeNotification(cleanedPayload);
    const notificationType = payload.notificationType as NotificationType;

    if (notificationType === "TEST") {
      return c.json({ message: "Test notification received", success: true });
    }

    let transactionInfo: AppStoreWebhookParams["transactionInfo"];
    if (payload.data?.signedTransactionInfo) {
      const txInfo = await verifier.verifyAndDecodeTransaction(
        payload.data.signedTransactionInfo
      );
      transactionInfo = {
        environment:
          txInfo.environment === Environment.PRODUCTION
            ? "Production"
            : "Sandbox",
        expiresDate: txInfo.expiresDate,
        originalTransactionId: txInfo.originalTransactionId ?? "",
        productId: txInfo.productId ?? "",
        transactionId: txInfo.transactionId ?? "",
      };
    }

    const workflowParams: AppStoreWebhookParams = {
      notificationType,
      rawBody: body,
      subtype: payload.subtype as string | undefined,
      transactionInfo,
    };

    await start(appStoreWebhookWorkflow, [workflowParams]);

    return c.json({ notificationType, success: true });
  } catch (error) {
    console.error("App Store webhook error:", error);

    if (error instanceof VerificationException) {
      console.error(
        `Verification failed: status=${error.status}, message=${error.message}`
      );
    }

    // Return 200 to prevent Apple from retrying excessively
    return c.json({
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    });
  }
});
