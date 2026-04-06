import { ALERT_SOURCES, ALERT_TYPES } from "@cobalt-web/db/schema/features";
import type {
  ItemErrorWebhook,
  ItemLoginRepairedWebhook,
  NewAccountsAvailableWebhook,
  PendingDisconnectWebhook,
} from "plaid";

import {
  insertAlertStep,
  resolveAlertsStep,
} from "@/workflows/shared/alert-steps";

import { updateItemStateStep, getPlaidItemStep } from "./steps";

type ItemWebhook =
  | ItemErrorWebhook
  | ItemLoginRepairedWebhook
  | NewAccountsAvailableWebhook
  | PendingDisconnectWebhook;

export interface PlaidItemWebhookResult {
  success: boolean;
  itemId: string | null;
  error?: string;
}

/**
 * Workflow for processing ITEM webhooks.
 * Handles NEW_ACCOUNTS_AVAILABLE, ERROR, PENDING_DISCONNECT, LOGIN_REPAIRED.
 */
export async function plaidItemWebhookWorkflow(
  webhook: ItemWebhook
): Promise<PlaidItemWebhookResult> {
  "use workflow";

  const itemId = webhook.item_id ?? null;

  try {
    // Look up item for userId + institution metadata (used for alerts & revalidation)
    let itemUserId: string | null = null;
    let itemData: Awaited<ReturnType<typeof getPlaidItemStep>> | null = null;
    if (itemId) {
      try {
        itemData = await getPlaidItemStep(itemId);
        itemUserId = itemData.userId;
      } catch {
        // Item not found — continue without revalidation
      }
    }

    const errorPayload =
      "error" in webhook ? (webhook as ItemErrorWebhook).error : undefined;

    const result = await updateItemStateStep({
      error: errorPayload,
      item_id: itemId,
      webhook_code: webhook.webhook_code ?? "UNKNOWN",
    });

    if ("skipped" in result && result.skipped) {
      return {
        itemId,
        success: true,
      };
    }

    // Insert or resolve alerts based on webhook type
    if (itemId && itemUserId && itemData) {
      const institutionName = itemData.institutionName ?? "Bank";
      const alertMetadata = {
        institutionLogo: itemData.institutionLogo ?? null,
        institutionName,
      };

      switch (webhook.webhook_code) {
        case "ERROR": {
          await insertAlertStep({
            message: `Go to Accounts → Bank Accounts tab, find ${institutionName} and click Fix Connection.`,
            metadata: alertMetadata,
            source: ALERT_SOURCES.PLAID,
            sourceId: itemId,
            title: `${institutionName} needs re-authentication`,
            type: ALERT_TYPES.REAUTH_NEEDED,
            userId: itemUserId,
          });
          break;
        }

        case "PENDING_DISCONNECT": {
          await insertAlertStep({
            message: `Go to Accounts → Bank Accounts tab, find ${institutionName} and click Fix Connection.`,
            metadata: alertMetadata,
            source: ALERT_SOURCES.PLAID,
            sourceId: itemId,
            title: `${institutionName} is about to disconnect`,
            type: ALERT_TYPES.PENDING_DISCONNECT,
            userId: itemUserId,
          });
          break;
        }

        case "NEW_ACCOUNTS_AVAILABLE": {
          await insertAlertStep({
            message: `Go to Accounts → Bank Accounts tab, find ${institutionName} and click Refresh connection (with the New badge).`,
            metadata: alertMetadata,
            source: ALERT_SOURCES.PLAID,
            sourceId: itemId,
            title: `New accounts available at ${institutionName}`,
            type: ALERT_TYPES.NEW_ACCOUNTS,
            userId: itemUserId,
          });
          break;
        }

        case "LOGIN_REPAIRED": {
          await resolveAlertsStep({
            source: ALERT_SOURCES.PLAID,
            sourceId: itemId,
          });
          break;
        }

        default: {
          break;
        }
      }
    }

    return {
      itemId,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId,
      success: false,
    };
  }
}
