import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

import { verifyApiKey } from "../api-keys-service.js";

/** Mirrors the apiKey plugin's `timeWindow` config (24h) in packages/auth. */
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 60 * 24;

/**
 * Compute Retry-After (in seconds) from the rate-limited key's
 * `lastRequest` timestamp + the fixed plugin window. Falls back to the full
 * window if `lastRequest` isn't present on the returned key object.
 */
function computeRetryAfterSeconds(key: unknown): number {
  const lastRequest = (key as { lastRequest?: Date | string | null } | null)?.lastRequest;
  if (!lastRequest) {
    return Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  }
  const lastMs = lastRequest instanceof Date ? lastRequest.getTime() : Date.parse(lastRequest);
  if (Number.isNaN(lastMs)) {
    return Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  }
  const resetMs = lastMs + RATE_LIMIT_WINDOW_MS - Date.now();
  return Math.max(1, Math.ceil(resetMs / 1000));
}

/**
 * Bearer-token gate for `/v1/*` public REST surface. Reads `Authorization:
 * Bearer ck_live_...`, verifies via Better Auth's apiKey plugin, attaches
 * the owning userId to ctx for downstream handlers.
 *
 * Does NOT accept session cookies — sessions are dashboard-only; public
 * SDKs always present a key.
 */
export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  const key = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;

  if (!key) {
    return c.json({ code: "missing_api_key", error: "Missing bearer token" }, 401);
  }

  const result = await verifyApiKey({ key });
  if (!result.valid || !result.key) {
    // Better Auth's apiKey plugin returns `code: "RATE_LIMITED"` when the
    // per-key request budget is exhausted. Map to 429 with a Retry-After
    // header so SDK consumers can back off correctly instead of treating it
    // as a stale-credential 401.
    if (result.error?.code === "RATE_LIMITED") {
      const resetSeconds = computeRetryAfterSeconds(result.key);
      c.header("Retry-After", String(resetSeconds));
      return c.json({ code: "rate_limited", error: "API key rate limit exceeded" }, 429);
    }
    return c.json(
      {
        code: result.error?.code ?? "invalid_api_key",
        error: "Invalid API key",
      },
      401,
    );
  }

  const userId =
    (result.key as { userId?: string; referenceId?: string }).userId ??
    (result.key as { referenceId?: string }).referenceId;

  if (!userId) {
    return c.json({ code: "invalid_api_key", error: "Key not bound to user" }, 401);
  }

  c.set("user", { id: userId } as never);
  c.set("zeroContext", { userId });
  await next();
});
