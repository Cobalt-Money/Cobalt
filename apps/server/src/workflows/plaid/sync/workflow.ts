import type { RecurringTransactionsUpdateWebhook } from "plaid";
import { createHook } from "workflow";

import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import {
  syncHoldings,
  syncInvestmentTransactions,
} from "../investments/orchestration";
import { syncLiabilities } from "../liabilities/orchestration";
import {
  backfillHistoricalSnapshotsStep,
  closeOnboardingProgressStep,
  duplicateCheckStep,
  emitOnboardingProgressStep,
  exchangePublicTokenStep,
  fetchItemForOnboardingStep,
  getPlaidItemStep,
  persistOnboardingItemStep,
  reconcileOrphanAccountsStep,
  removeItemStep,
  syncAccountsAndBalancesStep,
  syncBalancesStep,
  syncRecurringStep,
  syncTransactionsStep,
  triggerPlaidSyncStep,
} from "./steps";
import type { PlaidOnboardingPhase } from "./steps";

export interface PlaidOnboardingHookPayload {
  initial_update_complete: boolean;
  historical_update_complete: boolean;
}

export function plaidOnboardingHookToken(itemId: string): string {
  return `plaid:sync:${itemId}`;
}

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

/** Recurring / webhook-triggered sync. No progress stream, no first-time branch. */
export async function plaidSyncWorkflow(
  webhook: SyncUpdatesWebhook
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

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

    if (webhook.historical_update_complete) {
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

export interface PlaidInitialSyncInput {
  publicToken: string;
  userId: string;
}

/**
 * Onboarding workflow. Owns the entire post-Plaid-Link lifecycle:
 *   exchange → validate (dup check) → persist → trigger sync
 *   → park on iterable sync hook + run direct-API branches in parallel
 *   → emit unified progress on one runId.
 */
export async function plaidInitialSyncWorkflow(
  input: PlaidInitialSyncInput
): Promise<PlaidSyncResult> {
  "use workflow";

  let itemId = "";

  const emit = (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>
  ) => emitOnboardingProgressStep({ detail, itemId, phase, status });

  try {
    // Phase 1: exchange public token for access token.
    await emit("exchange", "start");
    const exchanged = await exchangePublicTokenStep(input.publicToken);
    const { accessToken } = exchanged;
    ({ itemId } = exchanged);
    await emit("exchange", "done", { itemId });

    // Phase 2: validate (fetch + duplicate check).
    await emit("validate", "start");
    const { item, accounts } = await fetchItemForOnboardingStep(accessToken);
    const dup = await duplicateCheckStep({
      accounts,
      institutionId: item.institution_id ?? null,
      userId: input.userId,
    });
    if (dup.isDuplicate) {
      await removeItemStep(accessToken);
      await emit("duplicate", "done", {
        duplicates: dup.duplicateAccounts,
      });
      await closeOnboardingProgressStep();
      return {
        error: "DUPLICATE_ACCOUNT",
        itemId,
        success: false,
      };
    }
    await emit("validate", "done");

    // Phase 3: persist item metadata.
    await emit("persist", "start");
    await persistOnboardingItemStep({
      accessToken,
      item,
      itemId,
      userId: input.userId,
    });
    await emit("persist", "done");

    // Decide which direct-API branches to run based on the item's products.
    const products = [
      ...((item.available_products ?? []) as string[]),
      ...((item.billed_products ?? []) as string[]),
    ];
    const productSet = new Set(products);
    const hasInvestments = productSet.has("investments");
    const hasLiabilities = productSet.has("liabilities");

    // Phase 4: nudge Plaid, then park on iterable sync hook.
    const syncHook = createHook<PlaidOnboardingHookPayload>({
      token: plaidOnboardingHookToken(itemId),
    });
    await triggerPlaidSyncStep(accessToken);
    await emit("waiting_for_plaid", "start");

    await Promise.all([
      handleSyncBranch(syncHook, accessToken, itemId, emit),
      hasInvestments
        ? handleHoldingsBranch(accessToken, emit)
        : Promise.resolve(),
      hasInvestments
        ? handleInvestmentsTxBranch(accessToken, emit)
        : Promise.resolve(),
      hasLiabilities
        ? handleLiabilitiesBranch(accessToken, itemId, emit)
        : Promise.resolve(),
    ]);

    await emit("done", "done");
    await closeOnboardingProgressStep();
    return { itemId, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await emit("error", "done", { message: errorMessage });
    await captureWorkflowExceptionStep(
      "plaid_initial_sync",
      toSerializableError(error),
      { itemId }
    );
    await closeOnboardingProgressStep();
    return { error: errorMessage, itemId, success: false };
  }
}

// Sync branch: iterable hook — SYNC_UPDATES_AVAILABLE fires twice (initial, historical).
async function handleSyncBranch(
  hook: AsyncIterable<PlaidOnboardingHookPayload>,
  accessToken: string,
  itemId: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>
  ) => Promise<void>
) {
  let initialDone = false;
  let historicalDone = false;
  let cachedBalances: Awaited<ReturnType<typeof syncBalancesStep>> | null =
    null;

  for await (const payload of hook) {
    if (payload.initial_update_complete && !initialDone) {
      await emit("waiting_for_plaid", "done");

      await emit("accounts", "start");
      await syncAccountsAndBalancesStep(accessToken, itemId);
      await reconcileOrphanAccountsStep(accessToken, itemId);
      await emit("accounts", "done");

      await emit("transactions", "start");
      const [txResult, balanceResult] = await Promise.all([
        syncTransactionsStep(accessToken, itemId, null),
        syncBalancesStep(accessToken, itemId),
      ]);
      await emit("transactions", "done", {
        added: txResult.added,
        modified: txResult.modified,
      });

      cachedBalances = balanceResult;
      initialDone = true;
    }

    if (payload.historical_update_complete && cachedBalances) {
      const backfillAccounts = cachedBalances.accounts.map((a) => ({
        availableBalance: a.balances.available ?? null,
        creditLimit: a.balances.limit ?? null,
        currentBalance: a.balances.current ?? 0,
        plaidAccountId: a.account_id,
      }));
      await emit("historical", "start");
      await Promise.all([
        backfillHistoricalSnapshotsStep(backfillAccounts),
        syncRecurringStep(accessToken, itemId),
      ]);
      await emit("historical", "done");
      historicalDone = true;
      break;
    }
  }

  if (!historicalDone) {
    await emit("historical", "done", { reason: "not_complete", skipped: true });
  }
}

async function handleHoldingsBranch(
  accessToken: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>
  ) => Promise<void>
) {
  await emit("holdings", "start");
  await syncHoldings(accessToken);
  await emit("holdings", "done");
}

async function handleInvestmentsTxBranch(
  accessToken: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>
  ) => Promise<void>
) {
  await emit("investment_transactions", "start");
  await syncInvestmentTransactions(accessToken);
  await emit("investment_transactions", "done");
}

async function handleLiabilitiesBranch(
  accessToken: string,
  itemId: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>
  ) => Promise<void>
) {
  await emit("liabilities", "start");
  await syncLiabilities(accessToken, itemId);
  await emit("liabilities", "done");
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
