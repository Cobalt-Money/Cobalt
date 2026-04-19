import {
  ALERT_SOURCES,
  ALERT_TYPES,
} from "@cobalt-web/db/schema/features/user-alerts";
import type {
  ItemErrorWebhook,
  ItemLoginRepairedWebhook,
  NewAccountsAvailableWebhook,
  PendingDisconnectWebhook,
} from "plaid";

import { insertAlertStep, resolveAlertsStep } from "../../shared/alert-steps";
import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import { getPlaidItemStep, updateItemStateStep } from "../sync/steps";

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

export async function plaidItemWebhookWorkflow(
  webhook: ItemWebhook
): Promise<PlaidItemWebhookResult> {
  "use workflow";

  const itemId = webhook.item_id ?? null;

  try {
    let itemUserId: string | null = null;
    let itemData: Awaited<ReturnType<typeof getPlaidItemStep>> | null = null;
    if (itemId) {
      try {
        itemData = await getPlaidItemStep(itemId);
        itemUserId = itemData.userId;
      } catch {
        // Item not found — continue without alerts
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
      return { itemId, success: true };
    }

    if (itemId && itemUserId && itemData) {
      const institutionName = itemData.institutionName ?? "Bank";
      const alertMetadata = {
        institutionLogo: itemData.institutionLogo ?? null,
        institutionName,
      };

      switch (webhook.webhook_code) {
        case "ERROR": {
          await insertAlertStep({
            message: `Reconnect ${institutionName} to resume syncing transactions and balances.`,
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
            message: `Reconnect ${institutionName} now to avoid losing access.`,
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
            message: `New accounts were added at ${institutionName}. Refresh to sync them.`,
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

    return { itemId, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_item",
      toSerializableError(error),
      { itemId }
    );
    return { error: errorMessage, itemId, success: false };
  }
}
