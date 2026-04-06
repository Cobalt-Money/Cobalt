import type { RecurringTransactionsUpdateWebhook } from "plaid";

import { getPlaidItemStep } from "../item/steps";
import {
  reconcileOrphanAccountsStep,
  syncAccountsAndBalancesStep,
  syncTransactionsStep,
  syncBalancesStep,
  syncRecurringStep,
  backfillHistoricalSnapshotsStep,
  dispatchSnapshotWorkflowStep,
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

/**
 * Main workflow for processing Plaid SYNC_UPDATES_AVAILABLE webhooks
 *
 * Optimized per Vercel Best Practices:
 * - Uses Promise.all() for independent operations (async-parallel)
 * - Fire-and-forget pattern (server-after-nonblocking)
 */
export async function plaidSyncWorkflow(
  webhook: SyncUpdatesWebhook
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    // Step 1: Get item from database
    const item = await getPlaidItemStep(webhook.item_id);

    // Track if this is first-time sync (before cursor is set)
    const isFirstTimeSync = !item.transactionsCursor;

    // Step 2: Sync accounts and balances (always, before transactions)
    // Must run on every sync so new accounts added at the bank are in bank_account
    // before we insert transactions (FK: transaction.plaidAccountId -> bank_account.plaidAccountId)
    await syncAccountsAndBalancesStep(item.plaidAccessToken, item.plaidItemId);

    // Step 2b: Reconcile orphan accounts (re-link: migrate snapshots, delete orphans)
    await reconcileOrphanAccountsStep(item.plaidAccessToken, item.plaidItemId);

    // Step 3 & 4: Sync transactions AND balances IN PARALLEL
    // Per async-parallel best practice: independent operations run concurrently
    const [, balanceResult] = await Promise.all([
      syncTransactionsStep(
        item.plaidAccessToken,
        item.plaidItemId,
        item.transactionsCursor
      ),
      syncBalancesStep(item.plaidAccessToken, item.plaidItemId),
    ]);

    // Step 5 & 6: Snapshots and recurring
    // On first-time sync with historical_update_complete: run backfill AND recurring in parallel
    // On first-time sync without historical_update_complete: just run backfill
    // On subsequent syncs: run today's snapshot, then recurring if applicable
    if (isFirstTimeSync || webhook.force_backfill) {
      // First-time: backfill includes today + all historical snapshots
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
      // Subsequent sync: dispatch the full snapshot workflow so it fetches fresh
      // balances from the Plaid API instead of using potentially stale webhook data.
      await dispatchSnapshotWorkflowStep(item.userId);

      // Sync recurring if historical update complete
      if (webhook.historical_update_complete) {
        await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);
      }
    }

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
 * Workflow for processing RECURRING_TRANSACTIONS_UPDATE webhooks.
 * Syncs recurring transaction streams from Plaid.
 */
export async function plaidRecurringTransactionsWorkflow(
  webhook: RecurringTransactionsUpdateWebhook
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    // Step 1: Get item from database
    const item = await getPlaidItemStep(webhook.item_id);

    // Step 2: Sync recurring transactions
    await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);

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
 * Workflow for syncing and backfilling after a successful re-authentication.
 * Self-contained: reconciles orphan accounts, syncs missed transactions,
 * and backfills snapshots for the gap period while the connection was broken.
 */
export async function plaidReauthSyncWorkflow(params: {
  item_id: string;
}): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    // Step 1: Get item from database
    const item = await getPlaidItemStep(params.item_id);

    // Step 2: Sync accounts and balances
    await syncAccountsAndBalancesStep(item.plaidAccessToken, item.plaidItemId);

    // Step 3: Reconcile orphan accounts — critical for reauth since Plaid may issue new account IDs
    await reconcileOrphanAccountsStep(item.plaidAccessToken, item.plaidItemId);

    // Step 4: Sync transactions and balances in parallel — pull missed data during error period
    const [, balanceResult] = await Promise.all([
      syncTransactionsStep(
        item.plaidAccessToken,
        item.plaidItemId,
        item.transactionsCursor
      ),
      syncBalancesStep(item.plaidAccessToken, item.plaidItemId),
    ]);

    // Step 5: Backfill snapshots for all accounts to fill the gap period
    // backfillHistoricalSnapshotsStep is idempotent — skips dates that already have snapshots
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

    return {
      itemId: params.item_id,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId: params.item_id,
      success: false,
    };
  }
}
