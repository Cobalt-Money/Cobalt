import {
  createLinkToken,
  fetchAccounts,
} from "@cobalt-web/server-data/plaid/link/actions";
import { syncNewAccountsForItem } from "@cobalt-web/server-data/plaid/link/mutations";
import { getAccessTokenForItem } from "@cobalt-web/server-data/plaid/link/queries";
import {
  errorResponseSchema,
  linkCompleteBodySchema,
  linkCompleteResponseSchema,
  linkTokenResponseSchema,
  plaidItemIdBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/plaid/link/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { plaidInitialInvestmentSyncWorkflow } from "../../../workflows/plaid/investments/workflow.js";
import { plaidLiabilitiesSyncWorkflow } from "../../../workflows/plaid/liabilities/workflow.js";
import {
  plaidInitialSyncWorkflow,
  plaidSyncWorkflow,
} from "../../../workflows/plaid/sync/workflow.js";
import { requireAuth } from "../middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const createLinkTokenRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/create-link-token",
  responses: {
    200: {
      content: { "application/json": { schema: linkTokenResponseSchema } },
      description: "Link token created",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Create a Plaid link token",
  tags: ["Plaid"],
});

const linkCompleteRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/linkComplete",
  request: {
    body: {
      content: { "application/json": { schema: linkCompleteBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: linkCompleteResponseSchema } },
      description: "Onboarding workflow started; tail /progress/:runId",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Complete Plaid Link:    public_token and start onboarding workflow",
  tags: ["Plaid"],
});

const syncNewAccountsRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sync-new-accounts",
  request: {
    body: {
      content: { "application/json": { schema: plaidItemIdBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Accounts synced",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Item not found",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Sync new accounts after Plaid Link update",
  tags: ["Plaid"],
});

// ── Handlers ────────────────────────────────────────────────────────

const linkRouter = new OpenAPIHono<AppEnv>()
  .openapi(createLinkTokenRoute, async (c) => {
    try {
      const result = await createLinkToken(c.var.user.id);
      return c.json(result, 200);
    } catch {
      return c.json({ error: "Error generating link token" }, 500);
    }
  })
  .openapi(linkCompleteRoute, async (c) => {
    try {
      const { public_token } = c.req.valid("json");
      const { runId } = await start(plaidInitialSyncWorkflow, [
        { publicToken: public_token, userId: c.var.user.id },
      ]);
      return c.json({ runId }, 200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start onboarding workflow";
      return c.json({ error: message }, 500);
    }
  })
  .openapi(syncNewAccountsRoute, async (c) => {
    const { plaidItemId } = c.req.valid("json");
    const userId = c.var.user.id;

    try {
      const accessToken = await getAccessTokenForItem(userId, plaidItemId);
      const accounts = await fetchAccounts(accessToken);
      await syncNewAccountsForItem(plaidItemId, accounts);

      await Promise.all([
        start(plaidSyncWorkflow, [
          {
            historical_update_complete: false,
            initial_update_complete: false,
            item_id: plaidItemId,
          },
        ]),
        start(plaidInitialInvestmentSyncWorkflow, [plaidItemId]),
        start(plaidLiabilitiesSyncWorkflow, [plaidItemId]),
      ]);

      return c.json({ success: true }, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync new accounts";
      if (message.includes("not found") || message.includes("access denied")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 500);
    }
  });

export { linkRouter };
