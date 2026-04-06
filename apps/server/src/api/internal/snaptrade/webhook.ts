import { OpenAPIHono } from "@hono/zod-openapi";
import { start } from "workflow/api";

import {
  snaptradeConnectionAddedWorkflow,
  snaptradeConnectionUpdatedWorkflow,
  snaptradeConnectionBrokenWorkflow,
  snaptradeConnectionFixedWorkflow,
  snaptradeConnectionDeletedWorkflow,
} from "@/workflows/snaptrade/connection-workflows";
import { snaptradeHoldingsUpdatedWorkflow } from "@/workflows/snaptrade/holdings-workflow";
import {
  snaptradeTransactionsInitialWorkflow,
  snaptradeTransactionsUpdatedWorkflow,
} from "@/workflows/snaptrade/transactions-workflows";

export const snaptradeWebhookRouter = new OpenAPIHono();

snaptradeWebhookRouter.post("/webhook", async (c) => {
  const body = await c.req.json();
  const {
    eventType,
    userId,
    brokerageAuthorizationId,
    brokerageId,
    accountId,
  } = body;

  if (!userId || !eventType) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  switch (eventType) {
    case "CONNECTION_ADDED": {
      await start(snaptradeConnectionAddedWorkflow, [
        { brokerageAuthorizationId, brokerageId, userId },
      ]);
      break;
    }

    case "CONNECTION_UPDATED": {
      await start(snaptradeConnectionUpdatedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      break;
    }

    case "CONNECTION_BROKEN": {
      await start(snaptradeConnectionBrokenWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      break;
    }

    case "CONNECTION_FIXED": {
      await start(snaptradeConnectionFixedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      break;
    }

    case "CONNECTION_DELETED": {
      await start(snaptradeConnectionDeletedWorkflow, [
        { brokerageAuthorizationId, userId },
      ]);
      break;
    }

    case "ACCOUNT_HOLDINGS_UPDATED": {
      await start(snaptradeHoldingsUpdatedWorkflow, [
        { accountId, brokerageAuthorizationId, details: body.details, userId },
      ]);
      break;
    }

    case "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE": {
      await start(snaptradeTransactionsInitialWorkflow, [
        { accountId, brokerageAuthorizationId, userId },
      ]);
      break;
    }

    case "ACCOUNT_TRANSACTIONS_UPDATED": {
      await start(snaptradeTransactionsUpdatedWorkflow, [
        { accountId, brokerageAuthorizationId, userId },
      ]);
      break;
    }

    default: {
      console.warn(`Unhandled SnapTrade webhook event type: ${eventType}`);
    }
  }

  return c.json({ success: true }, 200);
});
