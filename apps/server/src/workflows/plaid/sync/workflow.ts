import type { RecurringTransactionsUpdateWebhook } from "plaid";

import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import {
  backfillHistoricalSnapshotsStep,
  dispatchSnapshotWorkflowStep,
  getPlaidItemStep,
  reconcileOrphanAccountsStep,
  syncAccountsAndBalancesStep,
  syncBalancesStep,
  syncRecurringStep,
  syncTransactionsStep,
} from "./steps";

interface SyncUpdatesWebhook {
  item_id: string;
  initial_update_complete: boolean;
  historical_update_complete: boolean;
  force_backfill?: boolean;
}

export interface PlaidSyncResult {
  success: boolean;
  itemId: string;
  error?: string;
}

export async function plaidSyncWorkflow(
  webhook: SyncUpdatesWebhook
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    const isFirstTimeSync = !item.transactionsCursor;

    await syncAccountsAndBalancesStep(item.plaidAccessToken, item.plaidItemId);

    await reconcileOrphanAccountsStep(item.plaidAccessToken, item.plaidItemId);

    const [, balanceResult] = await Promise.all([
      syncTransactionsStep(
        item.plaidAccessToken,
        item.plaidItemId,
        item.transactionsCursor
      ),
      syncBalancesStep(item.plaidAccessToken, item.plaidItemId),
    ]);

    if (isFirstTimeSync || webhook.force_backfill) {
      const backfillAccounts = balanceResult.accounts.map((a) => ({
        availableBalance: a.balances.available ?? null,
        creditLimit: a.balances.limit ?? null,
        currentBalance: a.balances.current ?? 0,
        plaidAccountId: a.account_id,
      }));

      await (webhook.historical_update_complete
        ? Promise.all([
            backfillHistoricalSnapshotsStep(backfillAccounts),
            syncRecurringStep(item.plaidAccessToken, item.plaidItemId),
          ])
        : backfillHistoricalSnapshotsStep(backfillAccounts));
    } else {
      await dispatchSnapshotWorkflowStep(item.userId);

      if (webhook.historical_update_complete) {
        await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);
      }
    }

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_sync",
      toSerializableError(error),
      { itemId: webhook.item_id }
    );

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

export async function plaidRecurringTransactionsWorkflow(
  webhook: RecurringTransactionsUpdateWebhook
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_recurring",
      toSerializableError(error),
      { itemId: webhook.item_id }
    );

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

export async function plaidReauthSyncWorkflow(params: {
  item_id: string;
}): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(params.item_id);

    await syncAccountsAndBalancesStep(item.plaidAccessToken, item.plaidItemId);

    await reconcileOrphanAccountsStep(item.plaidAccessToken, item.plaidItemId);

    const [, balanceResult] = await Promise.all([
      syncTransactionsStep(
        item.plaidAccessToken,
        item.plaidItemId,
        item.transactionsCursor
      ),
      syncBalancesStep(item.plaidAccessToken, item.plaidItemId),
    ]);

    const backfillAccounts = balanceResult.accounts.map((a) => ({
      availableBalance: a.balances.available ?? null,
      creditLimit: a.balances.limit ?? null,
      currentBalance: a.balances.current ?? 0,
      plaidAccountId: a.account_id,
    }));

    await Promise.all([
      backfillHistoricalSnapshotsStep(backfillAccounts),
      syncRecurringStep(item.plaidAccessToken, item.plaidItemId),
    ]);

    return { itemId: params.item_id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_reauth_sync",
      toSerializableError(error),
      { itemId: params.item_id }
    );

    return {
      error: errorMessage,
      itemId: params.item_id,
      success: false,
    };
  }
}
