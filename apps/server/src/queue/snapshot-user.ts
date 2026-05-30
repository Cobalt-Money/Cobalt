/**
 * POST /api/queues/snapshot-user
 *
 * Push-mode consumer for the "snapshots" topic. Vercel Queues authenticates
 * the call via OIDC; the route is private (no public URL — only Vercel's
 * queue infrastructure can invoke it). One message = one userId = three
 * idempotent DB upserts. Throwing causes the queue to retry per its retry
 * policy; returning 200 acks the message.
 */

import { upsertAllBalanceSnapshots } from "@cobalt-web/server-data/snapshots/mutations";
import { handleCallback } from "@vercel/queue";
import { Hono } from "hono";

interface SnapshotMessage {
  userId: string;
}

const queueHandler = handleCallback<SnapshotMessage>(async (message) => {
  await upsertAllBalanceSnapshots(message.userId);
});

export const snapshotUserQueueRouter = new Hono().post(
  "/",
  async (c) => await queueHandler(c.req.raw),
);
