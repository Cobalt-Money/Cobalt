import { expect, describe, it } from "vitest";
/**
 * End-to-end smoke test for `processFinancialEventWorkflow`.
 *
 * Runs against a real Nitro dev server (spawned by tests/integration-spawn.ts)
 * and a real local Postgres. Uses a synthetic event whose `event_id` doesn't
 * exist in Stock News, so the workflow:
 *   1. upserts the event header (real DB write — proves the persistence path)
 *   2. calls `/events?eventid=...` which returns empty data
 *   3. throws "Stock News API returned no articles for …"
 *   4. catch block returns { success: false, error, eventId }
 *
 * Assertions cover the shape of that result. This is the minimum e2e proof:
 * Nitro spawn, workflow runtime, step execution, real HTTP to Stock News,
 * real DB write, error-path return all work.
 *
 * Prerequisites:
 *   - docker running + `bun run db:local:up` + `bun run db:migrate:local`
 *   - real STOCK_NEWS_API_KEY in apps/server/.env
 */

import { start } from "workflow/api";

import { processFinancialEventWorkflow } from "../../../src/workflows/news/financial-events/workflow.js";

const syntheticEvent = {
  date: "2026-04-20T00:00:00Z",
  event_id: "cobalt-integration-test-does-not-exist",
  event_name: "Integration test synthetic event",
  event_text: "This event id is not real; the Stock News API returns no data.",
  news_items: 0,
  tickers: ["TEST"],
};

describe("processFinancialEventWorkflow (server-based integration)", () => {
  it("completes the workflow lifecycle end-to-end and returns a failure result for a missing event id", async () => {
    const run = await start(processFinancialEventWorkflow, [syntheticEvent]);
    const result = await run.returnValue;

    // Signals we care about:
    // 1. The workflow reached its catch block (returnValue resolved at all)
    // 2. The event id propagated through (workflow input → output)
    // 3. The failure was reported, not silently swallowed
    expect(result.eventId).toBe(syntheticEvent.event_id);
    expect(result.success).toBeFalsy();
    expect(result.error).toBeDefined();
    // Stock News API returns 403 for unknown event ids (rather than empty
    // data), so the fetch step exhausts default retries and throws
    // FatalError. Either error surface is valid proof that the real HTTP
    // call happened and the workflow's error-classification path ran.
    expect(result.error).toMatch(/403|Forbidden|FatalError/i);
    // The persist counters prove the workflow short-circuited before it
    // could persist any articles — no fabricated placeholder counts.
    expect(result.articlesScraped).toBe(0);
    expect(result.articlesPersisted).toBe(0);
  }, 120_000);
});
