import type { RecurringTransactionsUpdateWebhook } from "plaid";
import { createHook, sleep } from "workflow";
import { start } from "workflow/api";

import { syncHoldings, syncInvestmentTransactions } from "../investments/orchestration";
import { plaidInitialInvestmentSyncWorkflow } from "../investments/workflow";
import { syncLiabilities } from "../liabilities/orchestration";
import { plaidLiabilitiesSyncWorkflow } from "../liabilities/workflow";
import {
  clearItemErrorStep,
  closeOnboardingProgressStep,
  duplicateCheckStep,
  emitOnboardingProgressStep,
  exchangePublicTokenStep,
  fetchItemForOnboardingStep,
  getPlaidItemStep,
  persistNewAccountsForItemStep,
  persistOnboardingItemStep,
  reconcileOrphanAccountsStep,
  removeItemStep,
  seedTodayPlaidSnapshotsStep,
  syncAccountsAndBalancesStep,
  syncBalancesStep,
  syncRecurringStep,
  syncTransactionsStep,
  enrichTransactionsStep,
} from "./steps";
import type { PlaidOnboardingPhase } from "./steps";

/**
 * Hard ceiling on how long the workflow waits for the Plaid Link outcome.
 * Most users finish Plaid Link in under a minute; 5m is a comfortable upper
 * bound that still cleans up dead sessions promptly. After this elapses, the
 * workflow self-cancels and emits "cancelled" with `reason: "timeout"`.
 */
const LINK_HOOK_TIMEOUT = "5m";

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
export async function plaidSyncWorkflow(webhook: SyncUpdatesWebhook): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncAccountsAndBalancesStep(item.plaidAccessToken, item.plaidItemId);
    await reconcileOrphanAccountsStep(item.plaidAccessToken, item.plaidItemId);

    await Promise.all([
      syncTransactionsStep(item.plaidAccessToken, item.plaidItemId, item.transactionsCursor),
      syncBalancesStep(item.plaidAccessToken, item.plaidItemId),
    ]);
    await enrichTransactionsStep(item.plaidItemId);

    // Snapshots are written by cron + at account creation only — recurring
    // webhooks update live balances and let the next cron tick capture state.
    if (webhook.historical_update_complete) {
      await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);
    }

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

export async function plaidRecurringTransactionsWorkflow(
  webhook: RecurringTransactionsUpdateWebhook,
): Promise<PlaidSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    await syncRecurringStep(item.plaidAccessToken, item.plaidItemId);

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

/**
 * Inputs for the add-account workflow. Route does the link-token mint
 * synchronously (so it can return `link_token` to the client without waiting
 * on a workflow stream) and pre-decides which post-Link branch the workflow
 * should take. The workflow's only job: park on the hook, then run the right
 * sync body when the client resolves with a publicToken.
 *
 *   - no mode flags    → fresh link (exchange → validate → persist → ...).
 *   - `updateMode`     → Scenario C: route detected an existing healthy
 *                        connection, minted an update-mode token. Workflow
 *                        skips dedup + historical, just persists new accounts.
 *   - `reauthMode`     → existing item is in error state. Workflow clears the
 *                        error and runs sync.
 */
export interface PlaidAddAccountInput {
  userId: string;
  hookToken: string;
  updateMode?: {
    plaidItemId: string;
    accessToken: string;
  };
  reauthMode?: {
    plaidItemId: string;
    accessToken: string;
  };
}

interface PlaidLinkResolution {
  publicToken?: string;
  cancelled?: boolean;
}

/** Wrapped in a step so `start()` doesn't run in workflow context. */
async function startUpdateModeChildSyncsStep(plaidItemId: string): Promise<void> {
  "use step";
  await Promise.all([
    start(plaidInitialInvestmentSyncWorkflow, [plaidItemId]),
    start(plaidLiabilitiesSyncWorkflow, [plaidItemId]),
  ]);
}

/**
 * Owns the whole add-account lifecycle — from the moment a link token is
 * minted through to the first complete sync. The workflow parks on a hook
 * while the user is in the Plaid Link UI, then branches on the resolution:
 *
 *   - cancelled  → emit `cancelled`, close stream, return.
 *   - updateMode → sync new accounts onto existing Item, kick child syncs.
 *   - fresh link → existing full onboarding path (exchange → validate → persist
 *                  → inline /transactions/sync paginated pull + parallel
 *                  holdings/investments/liabilities branches).
 */
export async function plaidAddAccountWorkflow(
  input: PlaidAddAccountInput,
): Promise<PlaidSyncResult> {
  "use workflow";

  let itemId = input.updateMode?.plaidItemId ?? input.reauthMode?.plaidItemId ?? "";

  const emit = (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>,
  ) => emitOnboardingProgressStep({ detail, itemId, phase, status });

  try {
    // Park on the Plaid Link outcome. Client posts to /resolveLink with
    // `{ publicToken }` on Plaid onSuccess or `{ cancelled: true }` on onExit.
    // Race against `sleep` so a closed-tab session doesn't leak a ghost run.
    const linkHook = createHook<PlaidLinkResolution>({
      token: input.hookToken,
    });
    await emit("waiting_for_link", "start");
    const resolution = await Promise.race([
      linkHook.then((r) => ({ kind: "resolved" as const, value: r })),
      sleep(LINK_HOOK_TIMEOUT).then(() => ({ kind: "timeout" as const })),
    ]);
    await emit("waiting_for_link", "done");

    if (resolution.kind === "timeout") {
      await emit("cancelled", "done", { reason: "timeout" });
      await closeOnboardingProgressStep();
      return { error: "timeout", itemId, success: false };
    }
    if (resolution.value.cancelled || !resolution.value.publicToken) {
      await emit("cancelled", "done");
      await closeOnboardingProgressStep();
      return { error: "cancelled", itemId, success: false };
    }
    const { publicToken } = resolution.value;

    // ── Reauth branch ────────────────────────────────────────────────────
    // User finished re-authenticating an existing connection. Plaid hands us a
    // public_token but we don't exchange it — the access token is unchanged.
    // The job is: clear error state + resolve alerts, then run the same sync
    // body as the recurring webhook path (accounts, balances, tx, snapshots).
    if (input.reauthMode) {
      const { accessToken, plaidItemId } = input.reauthMode;

      await emit("connecting", "start");
      await clearItemErrorStep(plaidItemId, input.userId);
      await emit("connecting", "done");

      await emit("accounts", "start");
      await syncAccountsAndBalancesStep(accessToken, plaidItemId);
      await reconcileOrphanAccountsStep(accessToken, plaidItemId);
      await emit("accounts", "done");

      const item = await getPlaidItemStep(plaidItemId);
      await emit("transactions", "start");
      const [txResult] = await Promise.all([
        syncTransactionsStep(accessToken, plaidItemId, item.transactionsCursor),
        syncBalancesStep(accessToken, plaidItemId),
      ]);
      await enrichTransactionsStep(plaidItemId);
      await emit("transactions", "done", {
        added: txResult.added,
        modified: txResult.modified,
      });

      await emit("historical", "start");
      await syncRecurringStep(accessToken, plaidItemId);
      await emit("historical", "done");

      // Liabilities can fail when the product isn't on the item — fire as a
      // child workflow so its product-not-supported error doesn't fail this run.
      await startUpdateModeChildSyncsStep(plaidItemId);

      await emit("done", "done");
      await closeOnboardingProgressStep();
      return { itemId: plaidItemId, success: true };
    }

    // ── Update-mode branch (Scenario C) ──────────────────────────────────
    if (input.updateMode) {
      const { accessToken, plaidItemId } = input.updateMode;

      await emit("accounts", "start");
      await persistNewAccountsForItemStep(accessToken, plaidItemId);
      await syncAccountsAndBalancesStep(accessToken, plaidItemId);
      await reconcileOrphanAccountsStep(accessToken, plaidItemId);
      await emit("accounts", "done");

      const item = await getPlaidItemStep(plaidItemId);
      await emit("transactions", "start");
      const [txResult] = await Promise.all([
        syncTransactionsStep(accessToken, plaidItemId, item.transactionsCursor),
        syncBalancesStep(accessToken, plaidItemId),
      ]);
      await enrichTransactionsStep(plaidItemId);
      await emit("transactions", "done", {
        added: txResult.added,
        modified: txResult.modified,
      });

      // Investments + liabilities are optional — fire them as children so a
      // product-not-supported error on one doesn't fail the whole flow.
      await startUpdateModeChildSyncsStep(plaidItemId);

      await emit("done", "done");
      await closeOnboardingProgressStep();
      return { itemId: plaidItemId, success: true };
    }

    // ── Fresh-link branch (full onboarding) ──────────────────────────────

    // Phase 1: exchange public token for access token.
    await emit("exchange", "start");
    const exchanged = await exchangePublicTokenStep(publicToken);
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
      return { error: "DUPLICATE_ACCOUNT", itemId, success: false };
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

    // Decide which direct-API branches to run based on actual linked account
    // subtypes. `available_products` / `billed_products` are institution-level
    // signals and don't guarantee the endpoint will accept this item — e.g.
    // Ally advertises `liabilities` but rejects with PRODUCTS_NOT_SUPPORTED
    // when the item has no loan/credit accounts. Plaid's official guidance
    // (docs/link/initializing-products): gate on linked account subtypes.
    const hasInvestments = accounts.some((a) => a.type === "investment" || a.type === "brokerage");
    const hasLiabilities = accounts.some(
      (a) =>
        a.subtype === "credit card" ||
        a.subtype === "paypal" ||
        a.subtype === "student" ||
        a.subtype === "mortgage",
    );

    // Phase 4: inline sync. Per Plaid's official pattern
    // (github.com/plaid/pattern/blob/master/server/update_transactions.js),
    // pull accounts + transactions directly via /transactions/sync paginated
    // loop instead of waiting on SYNC_UPDATES_AVAILABLE. Avoids a race where
    // Plaid fires the webhook before this workflow registers its hook —
    // observed in prod for fast-pulling institutions (Ally sandbox).
    // Webhook still drives ongoing syncs after onboarding via plaidSyncWorkflow.
    const branchResults = await Promise.allSettled([
      runOnboardingSyncBranch(accessToken, itemId, input.userId, emit),
      hasInvestments ? handleHoldingsBranch(accessToken, emit) : Promise.resolve(),
      hasInvestments ? handleInvestmentsTxBranch(accessToken, emit) : Promise.resolve(),
      hasLiabilities ? handleLiabilitiesBranch(accessToken, itemId, emit) : Promise.resolve(),
    ]);
    const [syncResult] = branchResults;
    if (syncResult.status === "rejected") {
      throw syncResult.reason;
    }

    await emit("done", "done");
    await closeOnboardingProgressStep();
    return { itemId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await emit("error", "done", { message: errorMessage });
    await closeOnboardingProgressStep();
    return { error: errorMessage, itemId, success: false };
  }
}

// Inline sync branch: paginate /transactions/sync directly instead of waiting
// for SYNC_UPDATES_AVAILABLE. Mirrors plaid/pattern updateTransactions().
async function runOnboardingSyncBranch(
  accessToken: string,
  itemId: string,
  userId: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>,
  ) => Promise<void>,
) {
  await emit("accounts", "start");
  await syncAccountsAndBalancesStep(accessToken, itemId);
  await reconcileOrphanAccountsStep(accessToken, itemId);
  await emit("accounts", "done");

  await emit("transactions", "start");
  const [txResult] = await Promise.all([
    syncTransactionsStep(accessToken, itemId, null),
    syncBalancesStep(accessToken, itemId),
  ]);
  await enrichTransactionsStep(itemId);
  await emit("transactions", "done", {
    added: txResult.added,
    modified: txResult.modified,
  });

  await emit("historical", "start");
  await Promise.all([syncRecurringStep(accessToken, itemId), seedTodayPlaidSnapshotsStep(userId)]);
  await emit("historical", "done");
}

async function handleHoldingsBranch(
  accessToken: string,
  emit: (
    phase: PlaidOnboardingPhase,
    status: "start" | "done",
    detail?: Record<string, unknown>,
  ) => Promise<void>,
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
    detail?: Record<string, unknown>,
  ) => Promise<void>,
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
    detail?: Record<string, unknown>,
  ) => Promise<void>,
) {
  await emit("liabilities", "start");
  await syncLiabilities(accessToken, itemId);
  await emit("liabilities", "done");
}
