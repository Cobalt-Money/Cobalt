import { describe, expect, it } from "vitest";
/**
 * Happy-path integration test for `processFinancialEventWorkflow`.
 *
 * Pulls a real recent event from Stock News API, runs the workflow against it
 * via the spawned Nitro dev server, and asserts that the full pipeline
 * completes — including the real AI Gateway call that our sad-path test
 * short-circuits before reaching.
 *
 * Cost per run: ~30-60s, a handful of Stock News + AI Gateway quota units.
 * Not wired into CI — invoke manually with `bun run test:integration:happy`
 * when you want end-to-end confidence (e.g. before shipping changes that
 * touch the workflow, agent, or mutations).
 */

import { db } from "@cobalt-web/db";
import { eventArticles, financialEvents } from "@cobalt-web/db/schema/news";
import { fetchRecentEvents } from "@cobalt-web/server-data/news/events/actions";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";

import { processFinancialEventWorkflow } from "../../../src/workflows/news/financial-events/workflow.js";

describe("processFinancialEventWorkflow — happy path (server-based integration)", () => {
  it("fetches real articles, scrapes them, calls the AI Gateway, and persists the summary", async () => {
    // Step 0: use a live event so the rest of the workflow has real data to
    // work with. Reaching into the real Stock News API here means the test
    // can fail for external reasons — which is the point: if the API is
    // down, we want to know before we find out in prod.
    const events = await fetchRecentEvents();
    const [firstEvent] = events;
    expect(firstEvent).toBeDefined();
    if (!firstEvent) {
      return;
    }

    console.log(`[test] using live event ${firstEvent.event_id}: ${firstEvent.event_name}`);

    // Step 1: run the workflow end-to-end.
    const run = await start(processFinancialEventWorkflow, [firstEvent]);
    const result = await run.returnValue;

    console.log(`[test] workflow returned: ${JSON.stringify(result)}`);

    // Step 2: assert the whole chain ran. The ProcessFinancialEventResult
    // exposes enough to prove each major stage happened — we don't need to
    // query PG directly.
    expect(result.eventId).toBe(firstEvent.event_id);
    expect(result.error).toBeUndefined();
    expect(result.success).toBeTruthy();
    // At least one article must have actually scraped — proves fetch +
    // Readability extraction worked against real HTML.
    expect(result.articlesScraped).toBeGreaterThan(0);
    // Something got persisted — proves the DB path ran without a SQL-shape
    // error at the real Drizzle client.
    expect(result.articlesPersisted).toBeGreaterThan(0);
    // Persisted should be ≥ scraped because failed scrapes are still
    // persisted as placeholders (source + image preserved).
    expect(result.articlesPersisted).toBeGreaterThanOrEqual(result.articlesScraped);
  }, 180_000);

  // Idempotency is a DB-layer invariant, independent of whether AI summary
  // generation happens to succeed for the live event. We test it outcome-
  // agnostically: run twice, assert the post-state matches the second run,
  // regardless of whether `success` was true or false.
  it("running the same event twice replaces rows in place — no duplicate rows", async () => {
    const events = await fetchRecentEvents();
    const [firstEvent] = events;
    expect(firstEvent).toBeDefined();
    if (!firstEvent) {
      return;
    }

    console.log(`[test] idempotency check against live event ${firstEvent.event_id}`);

    const firstRun = await start(processFinancialEventWorkflow, [firstEvent]);
    const firstResult = await firstRun.returnValue;
    console.log(`[test] first run: ${JSON.stringify(firstResult)}`);

    const secondRun = await start(processFinancialEventWorkflow, [firstEvent]);
    const secondResult = await secondRun.returnValue;
    console.log(`[test] second run: ${JSON.stringify(secondResult)}`);

    // Each run's persistence path is deterministic given the same Stock News
    // article list, so the two runs should land on the same persisted count.
    expect(secondResult.articlesPersisted).toBe(firstResult.articlesPersisted);

    // PG invariant #1: exactly one `financial_events` row per event_id even
    // after two runs — proves `ON CONFLICT (event_id) DO UPDATE` is working.
    const headerRows = await db
      .select({ id: financialEvents.id })
      .from(financialEvents)
      .where(eq(financialEvents.eventId, firstEvent.event_id));
    expect(headerRows).toHaveLength(1);

    // PG invariant #2: `event_articles` row count matches the most recent
    // workflow's persisted count — proves `DELETE WHERE financial_event_id =
    // X` + bulk `INSERT` is operating as a "replace" (no accumulation).
    const articleRows = await db
      .select({ id: eventArticles.id })
      .from(eventArticles)
      .where(eq(eventArticles.financialEventId, headerRows[0]?.id ?? ""));
    expect(articleRows).toHaveLength(secondResult.articlesPersisted);
  }, 300_000);
});
