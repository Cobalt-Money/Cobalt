/**
 * POST /api/queues/snapshot-user
 *
 * Push-mode consumer for the "snapshots" topic. Vercel Queues authenticates
 * the call via OIDC; the route is private (no public URL — only Vercel's
 * queue infrastructure can invoke it). One message reconciles that user's
 * SnapTrade connection health, then writes their idempotent balance snapshots.
 * Throwing causes the queue to retry per its retry policy; returning 200 acks
 * the message.
 */

import { getSnaptradeAuthorizationReconciliationTargets } from "@cobalt-web/server-data/providers/snaptrade/authorizations/queries";
import { upsertAllBalanceSnapshots } from "@cobalt-web/server-data/snapshots/mutations";
import { handleCallback } from "@vercel/queue";
import { Hono } from "hono";
import { start } from "workflow/api";

import { snaptradeConnectionReconciliationWorkflow } from "../workflows/snaptrade/connection/workflow.js";

interface SnapshotMessage {
  userId: string;
}

const queueHandler = handleCallback<SnapshotMessage>(async (message) => {
  const reconciliationTargets = await getSnaptradeAuthorizationReconciliationTargets(
    message.userId,
  );

  const firstTarget = reconciliationTargets.at(0);
  if (firstTarget) {
    await start(snaptradeConnectionReconciliationWorkflow, [
      {
        brokerageAuthorizationIds: reconciliationTargets.map(
          ({ authorizationId }) => authorizationId,
        ),
        userId: firstTarget.providerUserId,
      },
    ]);
  }

  await upsertAllBalanceSnapshots(message.userId);
});

export const snapshotUserQueueRouter = new Hono().post(
  "/",
  async (c) => await queueHandler(c.req.raw),
);
