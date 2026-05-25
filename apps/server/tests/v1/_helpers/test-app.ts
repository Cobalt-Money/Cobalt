import type { AppEnv } from "@cobalt-web/server-data/types";
import type { OpenAPIHono } from "@hono/zod-openapi";

/**
 * Fixed userId injected by the per-test `requireApiKey` mock. Every test in
 * `tests/v1/` should assert against this when verifying that the authed
 * identity reached the data layer.
 */
export const TEST_USER_ID = "user_test_00000000000000000000000000";

/**
 * Issue an in-process request against an OpenAPIHono router. No HTTP server.
 * Returns `Response` plus a parsed-JSON helper.
 */
export async function request(app: OpenAPIHono<AppEnv>, path: string, init?: RequestInit) {
  const res = await app.request(path, init);
  return {
    headers: res.headers,
    json: async <T = unknown>() => (await res.json()) as T,
    res,
    status: res.status,
  };
}
