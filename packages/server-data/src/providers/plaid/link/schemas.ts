import { z } from "@hono/zod-openapi";

export const updateLinkTokenBodySchema = z.object({
  mode: z.enum(["add-accounts", "add-products", "reauth"]),
  plaidItemId: z.string(),
});

/**
 * Hints from the Add Account dialog so the server can detect Scenario C
 * up-front and mint an update-mode token instead of a regular one.
 */
export const createLinkTokenBodySchema = z.object({
  institutionId: z.string().optional(),
});

/**
 * The add-account workflow starts when the link token is minted and parks on
 * a hook until the client reports the Plaid Link outcome via `/resolveLink`.
 * Response carries the `runId` for the progress stream and the `hookToken`
 * the client must echo back on success or cancel.
 *
 * `mode: "update"` signals Scenario C: the user already has a healthy
 * connection at this institution. The workflow's update-mode branch
 * syncs new accounts onto the existing Item instead of running full
 * onboarding (no historical backfill, no dedup).
 */
export const linkTokenResponseSchema = z.object({
  hookToken: z.string(),
  institutionLogo: z.string().nullable().optional(),
  institutionName: z.string().nullable().optional(),
  institutionUrl: z.string().nullable().optional(),
  link_token: z.string(),
  mode: z.enum(["update", "reauth"]).optional(),
  plaidItemId: z.string().optional(),
  runId: z.string(),
});

/**
 * Resolves the parked add-account workflow. Exactly one of `publicToken`
 * (Plaid onSuccess) or `cancelled: true` (Plaid onExit / user abandon).
 */
export const resolveLinkBodySchema = z.object({
  cancelled: z.boolean().optional(),
  hookToken: z.string(),
  publicToken: z.string().optional(),
});

export const successResponseSchema = z.object({
  success: z.boolean(),
});

export const errorResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string(),
});
