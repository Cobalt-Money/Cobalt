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

// Plaid SDK declares webhook_type/webhook_code as `string`, so the raw types
// don't form a discriminated union. Narrow them locally with literal
// discriminators so `switch` + `satisfies never` give compile-time
// exhaustiveness (SRI-#370 — silent-drop bug class).
type Discriminate<T, WT extends string, WC extends string> = Omit<
  T,
  "webhook_type" | "webhook_code"
> & {
  webhook_type: WT;
  webhook_code: WC;
};

type PlaidWebhook =
  | Discriminate<SyncUpdatesAvailableWebhook, "TRANSACTIONS", "SYNC_UPDATES_AVAILABLE">
  | Discriminate<
      RecurringTransactionsUpdateWebhook,
      "TRANSACTIONS",
      "RECURRING_TRANSACTIONS_UPDATE"
    >
  | Discriminate<HoldingsDefaultUpdateWebhook, "HOLDINGS", "DEFAULT_UPDATE">
  | Discriminate<InvestmentsDefaultUpdateWebhook, "INVESTMENTS_TRANSACTIONS", "DEFAULT_UPDATE">
  | Discriminate<
      InvestmentsHistoricalUpdateWebhook,
      "INVESTMENTS_TRANSACTIONS",
      "HISTORICAL_UPDATE"
    >
  | Discriminate<LiabilitiesDefaultUpdateWebhook, "LIABILITIES", "DEFAULT_UPDATE">
  | Discriminate<ItemErrorWebhook, "ITEM", "ERROR">
  | Discriminate<ItemLoginRepairedWebhook, "ITEM", "ITEM_LOGIN_REPAIRED">
  | Discriminate<NewAccountsAvailableWebhook, "ITEM", "NEW_ACCOUNTS_AVAILABLE">
  | Discriminate<PendingDisconnectWebhook, "ITEM", "PENDING_DISCONNECT">;

type ItemWebhook = Extract<PlaidWebhook, { webhook_type: "ITEM" }>;
type TransactionsWebhook = Extract<PlaidWebhook, { webhook_type: "TRANSACTIONS" }>;

async function handleTransactionsWebhook(webhook: TransactionsWebhook) {
  switch (webhook.webhook_code) {
    case "SYNC_UPDATES_AVAILABLE": {
      const token = plaidOnboardingHookToken(webhook.item_id);
      const payload = {
        historical_update_complete: webhook.historical_update_complete,
        initial_update_complete: webhook.initial_update_complete,
      };
      const hook = await getHookByToken(token).catch(() => null);
      if (hook) {
        await resumeHook(token, payload);
        console.log(`[plaid] Resumed onboarding run ${hook.runId} for item: ${webhook.item_id}`);
      } else {
        await start(plaidSyncWorkflow, [{ ...payload, item_id: webhook.item_id }]);
        console.log(`[plaid] Triggered sync workflow for item: ${webhook.item_id}`);
      }
      break;
    }

    case "RECURRING_TRANSACTIONS_UPDATE": {
      await start(plaidRecurringTransactionsWorkflow, [
        webhook as unknown as RecurringTransactionsUpdateWebhook,
      ]);
      console.log(`[plaid] Triggered recurring transactions workflow for item: ${webhook.item_id}`);
      break;
    }

    default: {
      webhook satisfies never;
      console.log(
        `[plaid] Unhandled TRANSACTIONS webhook code: ${(webhook as { webhook_code: string }).webhook_code}`,
      );
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
        await start(plaidHoldingsWorkflow, [webhook as HoldingsDefaultUpdateWebhook]);
        console.log(`[plaid] Triggered holdings workflow for item: ${webhook.item_id}`);
        break;
      }

      case "INVESTMENTS_TRANSACTIONS": {
        await start(plaidInvestmentTransactionsWorkflow, [
          webhook as InvestmentsDefaultUpdateWebhook | InvestmentsHistoricalUpdateWebhook,
        ]);
        console.log(
          `[plaid] Triggered investment transactions workflow for item: ${webhook.item_id}`,
        );
        break;
      }

      case "LIABILITIES": {
        await start(plaidLiabilitiesSyncWorkflow, [webhook.item_id]);
        console.log(`[plaid] Triggered liabilities workflow for item: ${webhook.item_id}`);
        break;
      }

      case "ITEM": {
        await start(plaidItemWebhookWorkflow, [webhook as ItemWebhook]);
        console.log(`[plaid] Triggered item webhook workflow: ${webhook.webhook_code}`);
        break;
      }

      default: {
        // Compile-time guard: adding a variant to PlaidWebhook without a case fails typecheck here.
        // Runtime: still ack so Plaid stops retrying; log for investigation.
        webhook satisfies never;
        console.log(
          `[plaid] Ignoring unhandled webhook type: ${(webhook as { webhook_type: string }).webhook_type}`,
        );
        return c.json({ status: "ignored" });
      }
    }

    return c.json({ status: "processing" });
  } catch (error) {
    console.error("[plaid] Webhook processing error:", error);
    return c.json({ code: "webhook_processing_failed", error: "Webhook processing failed" }, 500);
  }
});
