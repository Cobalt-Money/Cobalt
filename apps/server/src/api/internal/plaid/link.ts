import {
  createLinkToken,
  createLinkTokenForUpdate,
} from "@cobalt-web/server-data/providers/plaid/link/actions";
import { findExistingHealthyConnection } from "@cobalt-web/server-data/providers/plaid/link/queries";
import {
  createLinkTokenBodySchema,
  errorResponseSchema,
  linkTokenResponseSchema,
  resolveLinkBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/providers/plaid/link/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { v7 as uuidv7 } from "uuid";
import { resumeHook, start } from "workflow/api";

import { plaidAddAccountWorkflow } from "../../../workflows/plaid/sync/workflow.js";
import { requireAuth } from "../middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const createLinkTokenRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/createLinkToken",
  request: {
    body: {
      content: { "application/json": { schema: createLinkTokenBodySchema } },
      required: false,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: linkTokenResponseSchema } },
      description:
        "Link token minted; workflow parked on hook. Client must echo the Plaid Link outcome via /resolveLink",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Mint a Plaid link token and start the parked add-account workflow",
  tags: ["Plaid"],
});

const resolveLinkRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/resolveLink",
  request: {
    body: {
      content: { "application/json": { schema: resolveLinkBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Workflow resumed",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Invalid payload or foreign hook token",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Resolve a parked add-account workflow (Plaid onSuccess or onExit)",
  tags: ["Plaid"],
});

// ── Handlers ────────────────────────────────────────────────────────
// Hook tokens are opaque UUID v7s — sortable by mint time, unguessable, and
// short-lived (parked workflow auto-cancels at 5m). No userId or other
// routing info embedded — the workflow run holds that, and the token never
// leaves the server↔client trust boundary.

const linkRouter = new OpenAPIHono<AppEnv>()
  .openapi(createLinkTokenRoute, async (c) => {
    try {
      // Body is optional. New client posts `{ institutionId }` (Plaid `ins_X`,
      // optionally `plaid:`-prefixed) so the server can detect Scenario C
      // up-front and mint an update-mode token tied to the existing access
      // token. Older clients post nothing → fresh link.
      const body = await c.req
        .json<{ institutionId?: string }>()
        .catch(() => ({}) as { institutionId?: string });

      const userId = c.var.user.id;
      const insId = body.institutionId?.replace(/^plaid:/, "");

      // ── Scenario C: existing healthy connection at this institution.
      if (insId?.startsWith("ins_")) {
        const existing = await findExistingHealthyConnection(userId, insId);
        if (existing) {
          const tokenResult = await createLinkTokenForUpdate(
            existing.plaidAccessToken,
            userId,
            "add-accounts",
          );
          const hookToken = uuidv7();
          const run = await start(plaidAddAccountWorkflow, [
            {
              hookToken,
              updateMode: {
                accessToken: existing.plaidAccessToken,
                plaidItemId: existing.plaidItemId,
              },
              userId,
            },
          ]);
          return c.json(
            {
              hookToken,
              institutionLogo: existing.institutionLogo,
              institutionName: existing.institutionName,
              institutionUrl: existing.institutionUrl,
              link_token: tokenResult.link_token,
              mode: "update" as const,
              plaidItemId: existing.plaidItemId,
              runId: run.runId,
            },
            200,
          );
        }
      }

      // ── Fresh link.
      const tokenResult = await createLinkToken(userId);
      const hookToken = uuidv7();
      const run = await start(plaidAddAccountWorkflow, [{ hookToken, userId }]);
      return c.json(
        {
          hookToken,
          link_token: tokenResult.link_token,
          runId: run.runId,
        },
        200,
      );
    } catch (error) {
      console.error("[/createLinkToken] failed", error);
      const message = error instanceof Error ? error.message : "Error generating link token";
      return c.json({ error: message }, 500);
    }
  })
  .openapi(resolveLinkRoute, async (c) => {
    const { cancelled, hookToken, publicToken } = c.req.valid("json");

    if (!cancelled && !publicToken) {
      return c.json({ error: "Must provide publicToken or cancelled: true" }, 400);
    }

    try {
      await resumeHook(hookToken, { cancelled, publicToken });
      return c.json({ success: true }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resume workflow";
      return c.json({ error: message }, 500);
    }
  });

export { linkRouter };
