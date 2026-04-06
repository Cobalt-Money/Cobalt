import type { LiabilitiesDefaultUpdateWebhook } from "plaid";

import { getPlaidItemStep } from "../item/steps";
import { syncLiabilitiesStep } from "./steps";

// ============================================================================
// Result types
// ============================================================================

export interface PlaidLiabilitiesSyncResult {
  success: boolean;
  itemId: string;
  error?: string;
}

// ============================================================================
// Workflows
// ============================================================================

/**
 * Workflow for processing LIABILITIES: DEFAULT_UPDATE webhooks.
 * Triggered ~daily when liability data (payments, APRs, balances) changes.
 */
export async function plaidLiabilitiesWorkflow(
  webhook: LiabilitiesDefaultUpdateWebhook
): Promise<PlaidLiabilitiesSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncLiabilitiesStep(item.plaidAccessToken, item.plaidItemId);

    return {
      itemId: webhook.item_id,
      success: true,
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

/**
 * Combined workflow for initial liabilities sync after first connection.
 * Called directly from persist route (fire-and-forget, not webhook-driven).
 */
export async function plaidInitialLiabilitiesSyncWorkflow(
  itemId: string
): Promise<PlaidLiabilitiesSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);

    await syncLiabilitiesStep(item.plaidAccessToken, item.plaidItemId);

    return {
      itemId,
      success: true,
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      error: errorMessage,
      itemId,
      success: false,
    };
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return obj.message;
    }
    if (typeof obj.error === "string") {
      return obj.error;
    }
    // Plaid API errors (Axios response.data)
    const data = obj.response as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      const code = data.error_code;
      const msg = data.error_message;
      if (typeof code === "string" && typeof msg === "string") {
        return `${code}: ${msg}`;
      }
      if (typeof msg === "string") {
        return msg;
      }
      if (typeof code === "string") {
        return code;
      }
    }
    if (typeof obj.error_message === "string") {
      return obj.error_message;
    }
    if (
      typeof obj.error_code === "string" &&
      typeof obj.error_message === "string"
    ) {
      return `${obj.error_code}: ${obj.error_message}`;
    }
  }
  return String(error ?? "Unknown error");
}
