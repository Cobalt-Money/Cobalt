/**
 * POST /api/cron/refresh-fundamentals
 *
 * Called daily by Vercel Cron (0 13 * * 1-5 — 8am ET weekdays).
 * Authenticates via CRON_SECRET and starts the durable workflow.
 * Returns immediately — the workflow runs in the background.
 */

import { env } from "@cobalt-web/env/server";
import { Hono } from "hono";
import { start } from "workflow/api";

import { refreshFundamentalsWorkflow } from "../workflows/refresh-fundamentals/workflow.js";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const cronRefreshFundamentalsRouter = new Hono().get("/refresh-fundamentals", async (c) => {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return c.json({ error: "CRON_SECRET not configured" }, 503);
  }
  if (c.req.header("Authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  const run = await start(refreshFundamentalsWorkflow, [isoDate(today), isoDate(yesterday)]);

  return c.json({ date: isoDate(today), runId: run.runId, started: true });
});
