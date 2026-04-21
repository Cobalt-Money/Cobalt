/**
 * GET /api/cron/rss
 *
 * Starts the RSS sync workflow. Authenticates via CRON_SECRET and returns the
 * runId immediately — the workflow iterates active feeds in the background.
 */

import { env } from "@cobalt-web/env/server";
import { Hono } from "hono";
import { start } from "workflow/api";

import { rssSyncWorkflow } from "../workflows/news/rss/workflow.js";

export const cronRssRouter = new Hono().get("/rss", async (c) => {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return c.json({ error: "CRON_SECRET not configured" }, 503);
  }
  if (c.req.header("Authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const run = await start(rssSyncWorkflow, []);
  return c.json({ runId: run.runId, started: true });
});
