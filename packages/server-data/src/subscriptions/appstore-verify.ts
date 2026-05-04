import {
  Environment,
  SignedDataVerifier,
  VerificationException,
} from "@apple/app-store-server-library";
import { env } from "@cobalt-web/env/server";

import type { AppStoreNotificationType } from "./schemas.js";

/**
 * Thin wrapper around Apple's SignedDataVerifier SDK. Exposes a single
 * `verifyAppStoreNotification` action that the webhook handler can call
 * without owning any Apple-specific types or root-certificate bytes.
 *
 * Verification fails → `AppStoreVerificationError` (webhook returns 401).
 * Any other error → caller's normal error path (webhook returns 200 so
 * Apple doesn't retry on our bugs).
 */

// Apple Root CA – G3, DER-encoded, base64.
// Source: https://www.apple.com/certificateauthority/
const APPLE_ROOT_CA_G3_BASE64 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

const appStoreEnv =
  env.APPLE_APP_STORE_ENVIRONMENT === "Production" ? Environment.PRODUCTION : Environment.SANDBOX;

const verifier = new SignedDataVerifier(
  [Buffer.from(APPLE_ROOT_CA_G3_BASE64, "base64")],
  true, // enable OCSP revocation + date validation
  appStoreEnv,
  env.APPLE_APP_BUNDLE_IDENTIFIER,
  appStoreEnv === Environment.PRODUCTION ? env.APPLE_APP_ID : undefined,
);

export class AppStoreVerificationError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AppStoreVerificationError";
    this.status = status;
  }
}

export interface VerifiedAppStoreTransaction {
  originalTransactionId: string;
  transactionId?: string;
  productId?: string;
  expiresAt?: Date;
  environment: "Production" | "Sandbox";
}

export interface VerifiedAppStoreNotification {
  notificationType: AppStoreNotificationType;
  subtype?: string;
  /** Absent for TEST notifications and a handful of event types (e.g. CONSUMPTION_REQUEST). */
  transaction?: VerifiedAppStoreTransaction;
}

export async function verifyAppStoreNotification(
  signedPayload: string,
): Promise<VerifiedAppStoreNotification> {
  const cleaned = signedPayload.trim().replaceAll(/\s+/g, "");

  let payload: Awaited<ReturnType<SignedDataVerifier["verifyAndDecodeNotification"]>>;
  try {
    payload = await verifier.verifyAndDecodeNotification(cleaned);
  } catch (error) {
    if (error instanceof VerificationException) {
      throw new AppStoreVerificationError(
        `Notification signature invalid: ${error.message}`,
        error.status,
      );
    }
    throw error;
  }

  const notificationType = payload.notificationType as AppStoreNotificationType;
  const subtype = payload.subtype as string | undefined;

  const signedTx = payload.data?.signedTransactionInfo;
  if (!signedTx) {
    return { notificationType, subtype };
  }

  let tx: Awaited<ReturnType<SignedDataVerifier["verifyAndDecodeTransaction"]>>;
  try {
    tx = await verifier.verifyAndDecodeTransaction(signedTx);
  } catch (error) {
    if (error instanceof VerificationException) {
      throw new AppStoreVerificationError(
        `Transaction signature invalid: ${error.message}`,
        error.status,
      );
    }
    throw error;
  }

  if (!tx.originalTransactionId) {
    throw new Error("Transaction missing originalTransactionId");
  }

  return {
    notificationType,
    subtype,
    transaction: {
      environment: tx.environment === Environment.PRODUCTION ? "Production" : "Sandbox",
      expiresAt: typeof tx.expiresDate === "number" ? new Date(tx.expiresDate) : undefined,
      originalTransactionId: tx.originalTransactionId,
      productId: tx.productId,
      transactionId: tx.transactionId,
    },
  };
}
