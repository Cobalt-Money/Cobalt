import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { env } from "@cobalt-web/env/server";
import {
  createLinkToken,
  createLinkTokenForUpdate,
} from "@cobalt-web/server-data/providers/plaid/link/actions";
import { successResponseSchema } from "@cobalt-web/server-data/providers/plaid/_shared";
import {
  getExistingHealthyConnection,
  getInstitutionRoutingNumber,
} from "@cobalt-web/server-data/providers/plaid/link/queries";
import {
  createLinkTokenBodySchema,
  linkTokenResponseSchema,
  resolveLinkBodySchema,
} from "@cobalt-web/server-data/providers/plaid/link/schemas";
import { userCanAddConnection } from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";
import { randomBytes } from "node:crypto";
import { resumeHook, start } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { getTrustedPublicOriginFromRequest } from "../../../mcp/handle-mcp-request.js";
import { plaidAddAccountWorkflow } from "../../../workflows/plaid/sync/workflow.js";
import { requireAuth, requireNotDemo } from "../middleware.js";

const canonicalAuthHost = new URL(env.BETTER_AUTH_URL).host;

/** Opaque workflow-resume bearer. 256-bit random, base64url, prefixed for log grep. */
function generateHookToken(): string {
  return `cob_plink_${randomBytes(32).toString("base64url")}`;
}

// NOTE: `/createLinkToken` + `/resolveLink` are intentionally kept in this
// single file rather than split into `link/create-token/` + `link/resolve/`
// subfolders. Both are workflow-init/resume endpoints (not CRUD of a Plaid
// resource): they share the parked-workflow + hook-token state machine and
// the same `linkTokenResponseSchema` + `successResponseSchema` contracts.
// Splitting would scatter that shared lifecycle across two files for no
// readability gain — see `.agents/skills/cobalt/api-endpoints/SKILL.md`.
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
    403: jsonContent(errorResponseWithCodeSchema, "Not available in demo mode"),
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
    403: jsonContent(errorResponseWithCodeSchema, "Not available in demo mode"),
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
    // Only trust the request origin if it matches our canonical host or a
    // Cobalt-team Vercel preview URL. Otherwise (spoofed Host header from
    // an untrusted proxy) leave undefined so actions.ts falls back to
    // env.PLAID_WEBHOOK_URL. Without this, an attacker could redirect Plaid
    // Item webhooks to a server they control by spoofing X-Forwarded-Host.
    const trustedOrigin = getTrustedPublicOriginFromRequest(c.req.raw, canonicalAuthHost);
    const webhookUrl = trustedOrigin ? `${trustedOrigin}/webhooks/plaid` : undefined;

    // ── Scenario C: existing healthy connection at this institution.
    if (insId?.startsWith("ins_")) {
      const existing = await getExistingHealthyConnection(userId, insId);
      if (existing) {
        const tokenResult = await createLinkTokenForUpdate(
          existing.plaidAccessToken,
          userId,
          "add-accounts",
          { webhookUrl },
        );
        const hookToken = generateHookToken();
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
          linkTokenResponseSchema.parse({
            hookToken,
            institutionLogo: existing.institutionLogo,
            institutionName: existing.institutionName,
            institutionUrl: existing.institutionUrl,
            link_token: tokenResult.link_token,
            mode: "update" as const,
            plaidItemId: existing.plaidItemId,
            runId: run.runId,
          }),
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
          error: "Free tier allows 2 synced connections. Upgrade to Pro for unlimited.",
        },
        402,
      );
    }

    // ── Fresh link. ApiError thrown from createLinkToken bubbles to onError
    // and surfaces as 502 `{code:"link_token_failed", ...}`.
    // Pass routing_number (when known) so Plaid highlights the bank at the
    // top of its picker — best UX we get; no API to skip picker entirely.
    const routingNumber = insId?.startsWith("ins_")
      ? await getInstitutionRoutingNumber(insId)
      : null;
    const tokenResult = await createLinkToken(userId, { routingNumber, webhookUrl });
    const hookToken = generateHookToken();
    const run = await start(plaidAddAccountWorkflow, [{ hookToken, userId }]);
    return c.json(
      linkTokenResponseSchema.parse({
        hookToken,
        link_token: tokenResult.link_token,
        runId: run.runId,
      }),
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
      return c.json(successResponseSchema.parse({ success: true }), 200);
    } catch (error) {
      // resumeHook can throw if the hook token is unknown/expired/foreign.
      // We can't distinguish reliably from the workflow runtime, so map all
      // failures to a single neutral 500.
      const message = error instanceof Error ? error.message : "Failed to resume workflow";
      return c.json({ code: "resume_hook_failed", error: message }, 500);
    }
  });

export { linkRouter };
