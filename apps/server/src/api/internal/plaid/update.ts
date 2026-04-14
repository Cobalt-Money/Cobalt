import { createLinkTokenForUpdate } from "@cobalt-web/server-data/plaid/actions";
import {
  clearItemError,
  getAccessTokenForItem,
} from "@cobalt-web/server-data/plaid/mutations";
import {
  errorResponseSchema,
  linkTokenResponseSchema,
  plaidItemIdBodySchema,
  successResponseSchema,
  updateLinkTokenBodySchema,
} from "@cobalt-web/server-data/plaid/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const updateLinkTokenRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/link-token/update",
  request: {
    body: {
      content: {
        "application/json": { schema: updateLinkTokenBodySchema },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: linkTokenResponseSchema } },
      description: "Link token created",
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
  summary: "Create a Plaid link token for update mode",
  tags: ["Plaid"],
});

const clearReauthRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/clear-reauth",
  request: {
    body: {
      content: { "application/json": { schema: plaidItemIdBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Reauth cleared",
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
  summary: "Clear re-auth state after fixing connection",
  tags: ["Plaid"],
});

// ── Handlers ────────────────────────────────────────────────────────

const updateRouter = new OpenAPIHono<AppEnv>()
  .openapi(updateLinkTokenRoute, async (c) => {
    const { plaidItemId, mode } = c.req.valid("json");
    const userId = c.var.user.id;

    try {
      const accessToken = await getAccessTokenForItem(userId, plaidItemId);
      const result = await createLinkTokenForUpdate(accessToken, userId, mode);
      return c.json(result, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error generating link token";
      if (message.includes("not found") || message.includes("access denied")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 500);
    }
  })
  .openapi(clearReauthRoute, async (c) => {
    const { plaidItemId } = c.req.valid("json");
    const userId = c.var.user.id;

    try {
      await clearItemError(plaidItemId, userId);

      // FUTURE: wire workflow triggers (plaidReauthSyncWorkflow, plaidInitialLiabilitiesSyncWorkflow)

      return c.json({ success: true }, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear reauth";
      if (message.includes("not found") || message.includes("access denied")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: "Failed to clear reauth" }, 500);
    }
  });

export { updateRouter };
