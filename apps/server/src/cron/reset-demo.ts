/**
 * GET /api/cron/reset-demo
 *
 * Deletes ephemeral demo users older than 24h. ON DELETE CASCADE on every
 * user-owned table wipes their accounts/transactions/holdings/etc. CRON_SECRET gated.
 *
 * Schedule lives in apps/server/vercel.json.
 */

import { deleteStaleAnonymousUsers } from "@cobalt-web/server-data/user/mutations";
import { Hono } from "hono";

import { requireCronSecret } from "./_auth.js";

export const cronResetDemoRouter = new Hono().get("/reset-demo", async (c) => {
  const unauthorized = requireCronSecret(c);
  if (unauthorized) {
    return unauthorized;
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const deleted = await deleteStaleAnonymousUsers(cutoff);

  return c.json({ cutoff: cutoff.toISOString(), deleted: deleted.length });
});
