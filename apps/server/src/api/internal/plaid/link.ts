import {
  createLinkToken,
  exchangePublicToken,
  fetchAccounts,
  fetchInstitutionDetails,
  fetchItemAndAccounts,
  removeItem,
  triggerPlaidSync,
} from "@cobalt-web/server-data/plaid/item/actions";
import { isDuplicateAccountError } from "@cobalt-web/server-data/plaid/item/lib";
import {
  persistItemMetadata,
  getAccessTokenForItem,
  syncNewAccountsForItem,
} from "@cobalt-web/server-data/plaid/item/mutations";
import { checkForDuplicateAccounts } from "@cobalt-web/server-data/plaid/item/queries";
import {
  errorResponseSchema,
  exchangeTokenBodySchema,
  exchangeTokenResponseSchema,
  linkTokenResponseSchema,
  persistItemBodySchema,
  plaidItemIdBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/plaid/item/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { plaidInitialInvestmentSyncWorkflow } from "@/workflows/plaid/investments/workflow";
import { plaidInitialLiabilitiesSyncWorkflow } from "@/workflows/plaid/liabilities/workflow";
import { plaidSyncWorkflow } from "@/workflows/plaid/transactions/workflow";

// ── Route definitions ───────────────────────────────────────────────

const createLinkTokenRoute = createRoute({
  method: "post",
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

const exchangeTokenRoute = createRoute({
  method: "post",
  path: "/exchange-token",
  request: {
    body: {
      content: { "application/json": { schema: exchangeTokenBodySchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: exchangeTokenResponseSchema },
      },
      description: "Token exchanged",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Exchange a Plaid public token",
  tags: ["Plaid"],
});

const persistItemRoute = createRoute({
  method: "post",
  path: "/items/persist",
  request: {
    body: {
      content: { "application/json": { schema: persistItemBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Item persisted",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Duplicate account or bad request",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Persist Plaid item metadata and trigger sync",
  tags: ["Plaid"],
});

const syncNewAccountsRoute = createRoute({
  method: "post",
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

const linkRouter = new OpenAPIHono<AppEnv>();

linkRouter.openapi(createLinkTokenRoute, async (c) => {
  try {
    const result = await createLinkToken(c.var.user.id);
    return c.json(result, 200);
  } catch {
    return c.json({ error: "Error generating link token" }, 500);
  }
});

linkRouter.openapi(exchangeTokenRoute, async (c) => {
  try {
    const { public_token } = c.req.valid("json");
    const result = await exchangePublicToken(public_token);
    return c.json(result, 200);
  } catch {
    return c.json({ error: "Error exchanging public token" }, 500);
  }
});

linkRouter.openapi(persistItemRoute, async (c) => {
  const { access_token, item_id } = c.req.valid("json");
  const userId = c.var.user.id;

  try {
    // Check for duplicate accounts
    try {
      const { item, accounts } = await fetchItemAndAccounts(access_token);
      const institutionId = item.institution_id ?? null;

      const duplicateCheck = await checkForDuplicateAccounts(
        userId,
        institutionId,
        accounts.map((a) => ({
          mask: a.mask ?? null,
          name: a.name || a.official_name || "Account",
          type: a.type,
        }))
      );

      if (duplicateCheck.isDuplicate) {
        try {
          await removeItem(access_token);
        } catch {
          // Cleanup failure is non-critical
        }

        const duplicateMessages = duplicateCheck.duplicateAccounts.map(
          (dup) => {
            const dateStr = new Date(dup.createdAt).toLocaleDateString(
              "en-US",
              { day: "numeric", month: "short", year: "numeric" }
            );
            return `${dup.name} (linked on ${dateStr})`;
          }
        );

        return c.json(
          {
            code: "DUPLICATE_ACCOUNT",
            error: `This account is already connected. ${duplicateMessages.join(", ")}. If you want to refresh the connection, please remove it first and re-link.`,
          },
          400
        );
      }
    } catch {
      // Duplicate check failure is non-critical (defense in depth)
    }

    // Fetch institution details
    const { item } = await fetchItemAndAccounts(access_token);
    const institutionId = item.institution_id ?? null;
    let institutionName: string | null = null;
    let institutionLogo: string | null = null;

    if (institutionId) {
      const details = await fetchInstitutionDetails(institutionId);
      institutionName = details.name;
      institutionLogo = details.logo;
    }

    // Persist item metadata
    await persistItemMetadata({
      accessToken: access_token,
      availableProducts: (item.available_products ?? []) as string[],
      billedProducts: (item.billed_products ?? []) as string[],
      institutionId,
      institutionLogo,
      institutionName,
      itemId: item_id,
      userId,
      webhookUrl: item.webhook ?? null,
    });

    // Trigger sync
    await triggerPlaidSync(access_token);

    // Fire-and-forget: trigger investment and liabilities workflows
    start(plaidInitialInvestmentSyncWorkflow, [item_id]);
    start(plaidInitialLiabilitiesSyncWorkflow, [item_id]);

    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    if (isDuplicateAccountError(error)) {
      return c.json({ code: error.code, error: error.message }, 400);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to persist item and trigger sync";
    return c.json({ error: message }, 500);
  }
});

linkRouter.openapi(syncNewAccountsRoute, async (c) => {
  const { plaidItemId } = c.req.valid("json");
  const userId = c.var.user.id;

  try {
    const accessToken = await getAccessTokenForItem(userId, plaidItemId);
    const accounts = await fetchAccounts(accessToken);
    await syncNewAccountsForItem(plaidItemId, accounts);

    // Fire-and-forget: trigger sync workflows for new accounts
    start(plaidSyncWorkflow, [
      {
        historical_update_complete: false,
        initial_update_complete: true,
        item_id: plaidItemId,
      },
    ]);
    start(plaidInitialInvestmentSyncWorkflow, [plaidItemId]);
    start(plaidInitialLiabilitiesSyncWorkflow, [plaidItemId]);

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
