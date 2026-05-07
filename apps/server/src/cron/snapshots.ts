/**
 * GET /api/cron/snapshots
 *
 * Thin producer: auth → list users → bulk-publish to the "snapshots" queue
 * topic (one message per user). The consumer at /api/queues/snapshot-user
 * drains in the background with queue-native retries. CRON_SECRET gated.
 *
 * Schedule lives in apps/server/vercel.json (`0 22 * * *`). Queue consumer
 * trigger lives in apps/server/nitro.config.ts under
 * `vercel.functionRules["/api/queues/snapshot-user"].experimentalTriggers`.
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
