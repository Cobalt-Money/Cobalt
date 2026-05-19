import { env } from "@cobalt-web/env/server";
import type { Context } from "hono";

/**
 * Verify the Vercel cron secret on the request. Cron routes share this
 * preamble: 503 when the secret isn't configured, 401 on mismatch, null
 * when the caller is authorized.
 */
export function requireCronSecret(c: Context): Response | null {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return c.json({ error: "CRON_SECRET not configured" }, 503);
  }
  if (c.req.header("Authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return null;
}
