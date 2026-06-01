import { lookupPlaidConnection } from "@cobalt-web/server-data/providers/plaid/link/queries";
// Deep import to skip subscriptions/index barrel which pulls in Stripe/Apple client init at module load (breaks webhook unit tests with no API keys).
import { isConnectionActiveForUser } from "@cobalt-web/server-data/subscriptions/limits";
import { Hono } from "hono";
import type {
  HoldingsDefaultUpdateWebhook,
  InvestmentsDefaultUpdateWebhook,
  InvestmentsHistoricalUpdateWebhook,
  ItemErrorWebhook,
  ItemLoginRepairedWebhook,
  LiabilitiesDefaultUpdateWebhook,
  NewAccountsAvailableWebhook,
  PendingDisconnectWebhook,
  RecurringTransactionsUpdateWebhook,
  SyncUpdatesAvailableWebhook,
} from "plaid";
import { getHookByToken, resumeHook, start } from "workflow/api";

import {
  plaidHoldingsWorkflow,
  plaidInvestmentTransactionsWorkflow,
} from "../workflows/plaid/investments/workflow.js";
import { plaidItemWebhookWorkflow } from "../workflows/plaid/item/workflow.js";
import { plaidLiabilitiesSyncWorkflow } from "../workflows/plaid/liabilities/workflow.js";
import {
  plaidOnboardingHookToken,
  plaidRecurringTransactionsWorkflow,
  plaidSyncWorkflow,
} from "../workflows/plaid/sync/workflow.js";

type PlaidWebhook =
  | SyncUpdatesAvailableWebhook
  | RecurringTransactionsUpdateWebhook
  | HoldingsDefaultUpdateWebhook
  | InvestmentsDefaultUpdateWebhook
  | InvestmentsHistoricalUpdateWebhook
  | LiabilitiesDefaultUpdateWebhook
  | ItemErrorWebhook
  | ItemLoginRepairedWebhook
  | NewAccountsAvailableWebhook
  | PendingDisconnectWebhook;

type ItemWebhook = Extract<
  PlaidWebhook,
  | ItemErrorWebhook
  | ItemLoginRepairedWebhook
  | NewAccountsAvailableWebhook
  | PendingDisconnectWebhook
>;

async function handleTransactionsWebhook(webhook: PlaidWebhook) {
  switch (webhook.webhook_code) {
    case "SYNC_UPDATES_AVAILABLE": {
      const w = webhook as SyncUpdatesAvailableWebhook;
      const token = plaidOnboardingHookToken(w.item_id);
      const payload = {
        historical_update_complete: w.historical_update_complete,
        initial_update_complete: w.initial_update_complete,
      };
      const hook = await getHookByToken(token).catch(() => null);
      if (hook) {
        await resumeHook(token, payload);
        console.log(`[plaid] Resumed onboarding run ${hook.runId} for item: ${w.item_id}`);
      } else {
        await start(plaidSyncWorkflow, [{ ...payload, item_id: w.item_id }]);
        console.log(`[plaid] Triggered sync workflow for item: ${w.item_id}`);
      }
      break;
    }

    case "RECURRING_TRANSACTIONS_UPDATE": {
      const w = webhook as RecurringTransactionsUpdateWebhook;
      await start(plaidRecurringTransactionsWorkflow, [w]);
      console.log(`[plaid] Triggered recurring transactions workflow for item: ${w.item_id}`);
      break;
    }

    default: {
      console.log(`[plaid] Unknown TRANSACTIONS webhook code: ${webhook.webhook_code}`);
    }
  }
}

export const plaidWebhookRouter = new Hono().post("/", async (c) => {
  try {
    const webhook: PlaidWebhook = await c.req.json();
    console.log(
      `[plaid] Received webhook: ${webhook.webhook_type}/${webhook.webhook_code} for item ${webhook.item_id}`,
    );

    // Freeze gate: skip data-sync workflows for connections past the user's
    // free-tier cap. ITEM webhooks (error/repair/disconnect) always run so the
    // user can act on broken connections regardless of tier state.
    if (webhook.webhook_type !== "ITEM" && webhook.item_id) {
      const conn = await lookupPlaidConnection(webhook.item_id);
      if (!conn) {
        console.log(`[plaid] No connection row for item ${webhook.item_id}; acking.`);
        return c.json({ status: "ignored" });
      }
      const active = await isConnectionActiveForUser(conn.userId, conn.id, "plaid");
      if (!active) {
        console.log(
          `[plaid] Skipping ${webhook.webhook_type}/${webhook.webhook_code}; connection ${conn.id} frozen (free-tier cap).`,
        );
        return c.json({ status: "frozen" });
      }
    }

    switch (webhook.webhook_type) {
      case "TRANSACTIONS": {
        await handleTransactionsWebhook(webhook);
        break;
      }

      case "HOLDINGS": {
        const w = webhook as HoldingsDefaultUpdateWebhook;
        await start(plaidHoldingsWorkflow, [w]);
        console.log(`[plaid] Triggered holdings workflow for item: ${w.item_id}`);
        break;
      }

      case "INVESTMENTS_TRANSACTIONS": {
        const w = webhook as InvestmentsDefaultUpdateWebhook | InvestmentsHistoricalUpdateWebhook;
        await start(plaidInvestmentTransactionsWorkflow, [w]);
        console.log(`[plaid] Triggered investment transactions workflow for item: ${w.item_id}`);
        break;
      }

      case "LIABILITIES": {
        const w = webhook as LiabilitiesDefaultUpdateWebhook;
        await start(plaidLiabilitiesSyncWorkflow, [w.item_id]);
        console.log(`[plaid] Triggered liabilities workflow for item: ${w.item_id}`);
        break;
      }

      case "ITEM": {
        const w = webhook as ItemWebhook;
        await start(plaidItemWebhookWorkflow, [w]);
        console.log(`[plaid] Triggered item webhook workflow: ${w.webhook_code}`);
        break;
      }

      default: {
        console.log(`[plaid] Ignoring unhandled webhook type: ${webhook.webhook_type}`);
        return c.json({ status: "ignored" });
      }
    }

    return c.json({ status: "processing" });
  } catch (error) {
    console.error("[plaid] Webhook processing error:", error);
    return c.json({ code: "webhook_processing_failed", error: "Webhook processing failed" }, 500);
  }
});
