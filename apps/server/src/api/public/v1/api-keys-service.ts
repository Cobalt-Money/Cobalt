import { auth } from "@cobalt-web/auth";

/**
 * Plaintext verification for incoming `Authorization: Bearer ck_live_...`
 * headers on `/v1/*`. Returns `{ valid, error, key }`; `key` omits the secret.
 *
 * Dashboard CRUD (create/list/update/revoke/delete) is driven from the web
 * client via `authClient.apiKey.*` — those calls carry the user session, so
 * no server-side wrapper is needed.
 */
export function verifyApiKey(input: { key: string; permissions?: Record<string, string[]> }) {
  return auth.api.verifyApiKey({
    body: { key: input.key, permissions: input.permissions },
  });
}
