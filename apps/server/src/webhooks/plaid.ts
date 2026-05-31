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

    // Legacy transaction webhooks. Plaid still fires these for the *initial*
    // pull on freshly-linked items even when the integration uses
    // /transactions/sync — they precede the first SYNC_UPDATES_AVAILABLE.
    // Treat them as completion signals so the onboarding hook resumes
    // (otherwise accounts never persist for new items).
    case "INITIAL_UPDATE":
    case "HISTORICAL_UPDATE":
    case "DEFAULT_UPDATE": {
      const w = webhook as unknown as { item_id: string; webhook_code: string };
      const payload = {
        historical_update_complete:
          w.webhook_code === "HISTORICAL_UPDATE" || w.webhook_code === "DEFAULT_UPDATE",
        initial_update_complete: true,
      };
      const token = plaidOnboardingHookToken(w.item_id);
      const hook = await getHookByToken(token).catch(() => null);
      if (hook) {
        await resumeHook(token, payload);
        console.log(
          `[plaid] Resumed onboarding run ${hook.runId} via legacy ${w.webhook_code} for item: ${w.item_id}`,
        );
      } else {
        await start(plaidSyncWorkflow, [{ ...payload, item_id: w.item_id }]);
        console.log(
          `[plaid] Triggered sync workflow via legacy ${w.webhook_code} for item: ${w.item_id}`,
        );
      }
      break;
    }

    case "TRANSACTIONS_REMOVED": {
      // Handled by next /transactions/sync call — no action needed here.
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
