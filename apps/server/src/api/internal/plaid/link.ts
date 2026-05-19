import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  createLinkToken,
  createLinkTokenForUpdate,
} from "@cobalt-web/server-data/providers/plaid/link/actions";
import { findExistingHealthyConnection } from "@cobalt-web/server-data/providers/plaid/link/queries";
import {
  createLinkTokenBodySchema,
  linkTokenResponseSchema,
  resolveLinkBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/providers/plaid/link/schemas";
import { userCanAddConnection } from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";
import { v7 as uuidv7 } from "uuid";
import { resumeHook, start } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { plaidAddAccountWorkflow } from "../../../workflows/plaid/sync/workflow.js";
import { requireAuth, requireNotDemo } from "../middleware.js";

// ── Route definitions ───────────────────────────────────────────────

const createLinkTokenRoute = createRoute({
  method: "post",
  middleware: [requireAuth, requireNotDemo] as const,
  path: "/createLinkToken",
  request: {
    body: {
      content: { "application/json": { schema: createLinkTokenBodySchema } },
      required: false,
    },
  },
  responses: {
    200: jsonContent(
      linkTokenResponseSchema,
      "Link token minted; workflow parked on hook. Client must echo the Plaid Link outcome via /resolveLink",
    ),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    402: jsonContent(
      errorResponseWithCodeSchema,
      "Free-tier connection limit reached — upgrade required",
    ),
    422: validationErrorResponse(createLinkTokenBodySchema),
    502: jsonContent(errorResponseWithCodeSchema, "Plaid API failed"),
  },
  summary: "Mint a Plaid link token and start the parked add-account workflow",
  tags: ["Plaid"],
});

const resolveLinkRoute = createRoute({
  method: "post",
  middleware: [requireAuth, requireNotDemo] as const,
  path: "/resolveLink",
  request: {
    body: {
      content: { "application/json": { schema: resolveLinkBodySchema } },
    },
  },
  responses: {
    200: jsonContent(successResponseSchema, "Workflow resumed"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid payload or foreign hook token"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    422: validationErrorResponse(resolveLinkBodySchema),
    500: jsonContent(errorResponseWithCodeSchema, "Server error"),
  },
  summary: "Resolve a parked add-account workflow (Plaid onSuccess or onExit)",
  tags: ["Plaid"],
});

// ── Handlers ────────────────────────────────────────────────────────
// Hook tokens are opaque UUID v7s — sortable by mint time, unguessable, and
// short-lived (parked workflow auto-cancels at 5m). No userId or other
// routing info embedded — the workflow run holds that, and the token never
// leaves the server↔client trust boundary.

const linkRouter = createApp()
  .openapi(createLinkTokenRoute, async (c) => {
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

    // Fresh link path adds a new connection to the user's pooled count.
    // Scenario C above is exempt — update-mode reuses an existing item.
    if (!(await userCanAddConnection(userId))) {
      return c.json(
        {
          code: "connection_limit_reached",
          error: "Free tier allows 1 synced connection. Upgrade to Pro for unlimited.",
        },
        402,
      );
    }

    // ── Fresh link. ApiError thrown from createLinkToken bubbles to onError
    // and surfaces as 502 `{code:"link_token_failed", ...}`.
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
  })
  .openapi(resolveLinkRoute, async (c) => {
    const { cancelled, hookToken, publicToken } = c.req.valid("json");

    if (!cancelled && !publicToken) {
      return c.json(
        {
          code: "invalid_resolve_payload",
          error: "Must provide publicToken or cancelled: true",
        },
        400,
      );
    }

    try {
      await resumeHook(hookToken, { cancelled, publicToken });
      return c.json({ success: true }, 200);
    } catch (error) {
      // resumeHook can throw if the hook token is unknown/expired/foreign.
      // We can't distinguish reliably from the workflow runtime, so map all
      // failures to a single neutral 500.
      const message = error instanceof Error ? error.message : "Failed to resume workflow";
      return c.json({ code: "resume_hook_failed", error: message }, 500);
    }
  });

export { linkRouter };
