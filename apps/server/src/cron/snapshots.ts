/**
 * GET /api/cron/snapshots
 *
 * Thin producer: auth → list users → bulk-publish to the "snapshots" queue
 * topic (one message per user). The consumer at /api/queues/snapshot-user
 * drains in the background with queue-native retries. CRON_SECRET gated.
 *
 * NOT YET WIRED IN vercel.json. To activate:
 *   1. Add to `crons`:
 *        { "path": "/api/cron/snapshots", "schedule": "0 22 * * *" }
 *   2. Add `functions.<entry>.experimentalTriggers` for the queue
 *      consumer (see apps/server/src/queue/snapshot-user.ts for the
 *      path to wire). Entry key is the Nitro-compiled function path —
 *      verify in the Vercel dashboard after first deploy.
 */

import { env } from "@cobalt-web/env/server";
import { getUserIdsWithConnectedAccounts } from "@cobalt-web/server-data/user/queries";
import { send } from "@vercel/queue";
import { Hono } from "hono";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const cronSnapshotsRouter = new Hono().get("/snapshots", async (c) => {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return c.json({ error: "CRON_SECRET not configured" }, 503);
  }
  if (c.req.header("Authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userIds = await getUserIdsWithConnectedAccounts();
  if (userIds.length === 0) {
    return c.json({ enqueued: 0 });
  }

  const date = todayIso();
  const results = await Promise.all(
    userIds.map((userId) =>
      send("snapshots", { userId }, { idempotencyKey: `snapshot-${userId}-${date}` }),
    ),
  );

  return c.json({
    enqueued: results.length,
    messageIds: results.map((r) => r.messageId),
  });
});
