/**
 * E2E fixture helpers — exercise the REAL Better Auth flow against the
 * spawned Nitro to issue a `ck_live_` key.
 *
 *   1. POST /api/demo/create  → anonymous user + session cookies
 *   2. POST /api/auth/api-key/create (with cookies) → `ck_live_...` token
 *
 * Cookie-jar handling is deliberately minimal: Better Auth sets a single
 * signed session cookie; we capture it verbatim from `set-cookie` and replay
 * it on the next request. No need for tough-cookie.
 */

export const BASE_URL = "http://localhost:4000";

interface IssuedKey {
  apiKey: string;
  userId: string;
}

/**
 * Spin a fresh anonymous demo user and issue a public API key bound to it.
 * Each call = a brand-new isolated user. Tests should NOT share keys across
 * cases — concurrent tests would otherwise contend on the same rate-limit
 * bucket and the same DB rows.
 */
export async function issueTestApiKey(): Promise<IssuedKey> {
  // Step 1: anonymous demo user — internal /api/demo/create returns the new
  // user id and sets a session cookie via `set-cookie`.
  const demoRes = await fetch(`${BASE_URL}/api/demo/create`, {
    method: "POST",
  });
  if (!demoRes.ok) {
    throw new Error(
      `demo/create failed: ${demoRes.status} ${await demoRes.text().catch(() => "")}`,
    );
  }
  const demoBody = (await demoRes.json()) as { userId?: string };
  if (!demoBody.userId) {
    throw new Error("demo/create returned no userId");
  }

  // Capture every `set-cookie` so the API key issuance request is recognised
  // as the same session. `getSetCookie()` works in undici/Node 22+ and Bun.
  const cookies = demoRes.headers.getSetCookie().join("; ");
  if (!cookies) {
    throw new Error("demo/create returned no session cookie");
  }

  // Step 2: issue API key via Better Auth's apiKey plugin endpoint.
  // Plaintext `key` is returned ONCE on creation; we capture it here.
  //
  // Better Auth's `/api/auth/*` routes enforce a CORS origin check —
  // requests without `Origin` get 403 MISSING_OR_NULL_ORIGIN. `localhost:3000`
  // is in the server's `trustedOrigins` (packages/auth/src/index.ts), so we
  // pin to it to match what the web client would send.
  const keyRes = await fetch(`${BASE_URL}/api/auth/api-key/create`, {
    body: JSON.stringify({ name: `e2e-${Date.now()}` }),
    headers: {
      "content-type": "application/json",
      cookie: cookies,
      origin: "http://localhost:3000",
    },
    method: "POST",
  });
  if (!keyRes.ok) {
    throw new Error(
      `api-key/create failed: ${keyRes.status} ${await keyRes.text().catch(() => "")}`,
    );
  }
  const keyBody = (await keyRes.json()) as { key?: string };
  if (!keyBody.key) {
    throw new Error("api-key/create returned no plaintext key");
  }

  return { apiKey: keyBody.key, userId: demoBody.userId };
}

/**
 * Convenience wrapper: `GET /v1/...` with the issued bearer attached.
 * Returns the raw `Response` plus a typed-JSON accessor; tests assert on
 * `status` + parsed body.
 */
export async function v1(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<{
  json: <T = unknown>() => Promise<T>;
  res: Response;
  status: number;
}> {
  const res = await fetch(`${BASE_URL}/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  return {
    json: async <T = unknown>() => (await res.json()) as T,
    res,
    status: res.status,
  };
}
