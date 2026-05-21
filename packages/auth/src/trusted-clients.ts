/**
 * OAuth clients pre-blessed by Cobalt. Members of this set:
 *
 *   1. Are cached + made immutable through Better Auth's `cachedTrustedClients`
 *      option (CRUD endpoints reject mutate/delete for these IDs).
 *   2. Render with the "Verified" trust tier on the consent screen — full
 *      logo, full client_name, normal styling.
 *
 * Clients NOT in this set still complete the OAuth flow (DCR remains open
 * for Cursor/Claude/Zed/etc. to self-register), but their consent UI is
 * rendered with the "Unverified" tier — generic icon, hostname-only,
 * warning banner — so attacker-controlled metadata can't be used for
 * brand impersonation or visual phishing (see SRI-340).
 *
 * Adding a new entry requires the client_id to already exist as a row in
 * the `oauthClient` table (Better Auth's `cachedTrustedClients` is a
 * caching + immutability flag, not a seed). Either:
 *
 *   - Register the client once via the normal DCR flow, capture the
 *     generated `client_id`, then hardcode it here, OR
 *   - Pick a stable string and insert the row via SQL/seed migration
 *     before deploying with the new ID in the set.
 */

/**
 * Raycast extension (`apps/raycast`).
 *
 * Source of truth: `apps/raycast/src/oauth.ts` — the extension ships with
 * this `client_id` hardcoded. Originally created via DCR during dev; it
 * stays as a random opaque string for backwards compatibility with already-
 * installed Raycast extensions.
 */
export const RAYCAST_CLIENT_ID = "jxihLeaSnvTNEHoALsPewQeLTUOVChxJ";

/**
 * Set passed to `oauthProvider({ cachedTrustedClients })`. Also exported
 * for the consent screen so it can branch UI on trust tier.
 *
 * Keep small. The intent is "clients Cobalt itself ships or has
 * explicitly partnered with", not "clients we've seen behave well".
 */
export const TRUSTED_CLIENT_IDS: ReadonlySet<string> = new Set([RAYCAST_CLIENT_ID]);

export function isTrustedClientId(clientId: string | null | undefined): boolean {
  return typeof clientId === "string" && TRUSTED_CLIENT_IDS.has(clientId);
}
