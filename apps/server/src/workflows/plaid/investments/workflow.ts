import type {
  HoldingsDefaultUpdateWebhook,
  InvestmentsDefaultUpdateWebhook,
  InvestmentsHistoricalUpdateWebhook,
} from "plaid";

import { captureWorkflowExceptionStep, toSerializableError } from "../../shared/steps";
import { getPlaidItemStep } from "../sync/steps";
import { syncHoldings, syncInvestmentTransactions } from "./orchestration";
import type { PlaidInvestmentSyncResult } from "./types";

export async function plaidInitialInvestmentSyncWorkflow(
  itemId: string,
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);
    await syncHoldings(item.plaidAccessToken);
    await syncInvestmentTransactions(item.plaidAccessToken);
    return { itemId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep("plaid_investments", toSerializableError(error), { itemId });
    return { error: errorMessage, itemId, success: false };
  }
}

export async function plaidHoldingsWorkflow(
  webhook: HoldingsDefaultUpdateWebhook,
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);
    await syncHoldings(item.plaidAccessToken);
    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep("plaid_investments", toSerializableError(error), {
      itemId: webhook.item_id,
    });
    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

export async function plaidInvestmentTransactionsWorkflow(
  webhook: InvestmentsDefaultUpdateWebhook | InvestmentsHistoricalUpdateWebhook,
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);
    await syncInvestmentTransactions(item.plaidAccessToken);
    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep("plaid_investments", toSerializableError(error), {
      itemId: webhook.item_id,
    });
    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}
