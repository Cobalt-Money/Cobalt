import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { start } from "workflow/api";

import {
  plaidHoldingsWorkflow,
  plaidInvestmentTransactionsWorkflow,
} from "@/workflows/plaid/investments/workflow";
import { plaidItemWebhookWorkflow } from "@/workflows/plaid/item/workflows";
import {
  plaidSyncWorkflow,
  plaidRecurringTransactionsWorkflow,
} from "@/workflows/plaid/transactions/workflow";

export const webhookRouter = new OpenAPIHono<AppEnv>();

webhookRouter.post("/webhook", async (c) => {
  const webhook = await c.req.json();

  const { webhook_type, webhook_code } = webhook;

  switch (webhook_type) {
    case "TRANSACTIONS": {
      if (webhook_code === "SYNC_UPDATES_AVAILABLE") {
        await start(plaidSyncWorkflow, [webhook]);
      } else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
        await start(plaidRecurringTransactionsWorkflow, [webhook]);
      }
      break;
    }

    case "HOLDINGS": {
      await start(plaidHoldingsWorkflow, [webhook]);
      break;
    }

    case "INVESTMENTS_TRANSACTIONS": {
      await start(plaidInvestmentTransactionsWorkflow, [webhook]);
      break;
    }

    case "ITEM": {
      await start(plaidItemWebhookWorkflow, [webhook]);
      break;
    }

    default: {
      break;
    }
  }

  return c.json({ status: "ok" }, 200);
});
