/**
 * GET /api/cron/financial-events
 *
 * Pulls recent events from Stock News API, skips any we've already scraped
 * + summarized, and fans out a durable workflow per event. Returns immediately —
 * each workflow runs in the background.
 */

import { env } from "@cobalt-web/env/server";
import { fetchRecentEvents } from "@cobalt-web/server-data/news/events/actions";
import { listProcessedEventIds } from "@cobalt-web/server-data/news/events/queries";
import { Hono } from "hono";
import { start } from "workflow/api";

import { processFinancialEventWorkflow } from "../workflows/news/financial-events/workflow.js";

const MAX_EVENTS_PER_RUN = 30;

export const cronFinancialEventsRouter = new Hono().get("/financial-events", async (c) => {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return c.json({ error: "CRON_SECRET not configured" }, 503);
  }
  if (c.req.header("Authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const events = await fetchRecentEvents();
  const processed = await listProcessedEventIds(events.map((e) => e.event_id));
  const unprocessed = events.filter((e) => !processed.has(e.event_id)).slice(0, MAX_EVENTS_PER_RUN);

  if (unprocessed.length === 0) {
    return c.json({ triggered: 0 });
  }

  const runs = await Promise.all(
    unprocessed.map((event) => start(processFinancialEventWorkflow, [event])),
  );

  return c.json({
    runIds: runs.map((r) => r.runId),
    triggered: unprocessed.length,
  });
});
