import type {
  HoldingsDefaultUpdateWebhook,
  InvestmentsDefaultUpdateWebhook,
  InvestmentsHistoricalUpdateWebhook,
} from "plaid";

import { getPlaidItemStep } from "../item/steps";
import { syncHoldingsStep, syncInvestmentTransactionsStep } from "./steps";

// ============================================================================
// Result types
// ============================================================================

export interface PlaidInvestmentSyncResult {
  success: boolean;
  itemId: string;
  error?: string;
}

// ============================================================================
// Workflows
// ============================================================================

/**
 * Workflow for processing HOLDINGS: DEFAULT_UPDATE webhooks.
 * Triggered daily overnight when holdings quantities/prices change.
 */
export async function plaidHoldingsWorkflow(
  webhook: HoldingsDefaultUpdateWebhook
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncHoldingsStep(item.plaidAccessToken, item.plaidItemId);

    return {
      itemId: webhook.item_id,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

/**
 * Workflow for processing INVESTMENTS_TRANSACTIONS: DEFAULT_UPDATE webhooks.
 * Triggered daily overnight when new investment transactions are available.
 * Also handles the initial HISTORICAL_UPDATE after first connection.
 */
export async function plaidInvestmentTransactionsWorkflow(
  webhook: InvestmentsDefaultUpdateWebhook | InvestmentsHistoricalUpdateWebhook
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncInvestmentTransactionsStep(
      item.plaidAccessToken,
      item.plaidItemId
    );

    return {
      itemId: webhook.item_id,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

/**
 * Combined workflow for initial investment sync after first connection.
 * Runs holdings AND investment transactions in parallel.
 * Called directly from triggerPlaidSync (not webhook-driven).
 */
export async function plaidInitialInvestmentSyncWorkflow(
  itemId: string
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);

    await Promise.all([
      syncHoldingsStep(item.plaidAccessToken, item.plaidItemId),
      syncInvestmentTransactionsStep(item.plaidAccessToken, item.plaidItemId),
    ]);

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
