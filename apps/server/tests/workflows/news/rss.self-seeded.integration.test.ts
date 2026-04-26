/**
 * Self-contained happy-path integration test for `rssSyncWorkflow`.
 *
 * Seeds its own test RSS feed in `beforeAll`, runs the workflow end-to-end
 * against a real public feed, asserts articles land in the DB, then cleans
 * up everything it created in `afterAll`. No manual DB setup required.
 *
 * Prerequisites:
 *   1. `bun run db:local:up`     — local Postgres on 127.0.0.1:5433
 *   2. `bun run db:migrate:local` — apply migrations
 *   3. Network access to the seeded feed URL
 *
 * Run with: `bun run test:integration:happy`
 */

import { db } from "@cobalt-web/db";
import { rssArticles, rssFeeds } from "@cobalt-web/db/schema/news";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { start } from "workflow/api";

import { rssSyncWorkflow } from "../../../src/workflows/news/rss/workflow.js";

const TEST_FEED_URL = "https://www.cnbc.com/id/100003114/device/rss/rss.html";
const TEST_FEED_NAME = "[integration-test] CNBC Markets";

describe("rssSyncWorkflow (self-seeded integration)", () => {
  let testFeedId: string;

  beforeAll(async () => {
    // Clean up any stale test feed from a prior aborted run so we start fresh.
    await db.delete(rssFeeds).where(eq(rssFeeds.url, TEST_FEED_URL));

    const [inserted] = await db
      .insert(rssFeeds)
      .values({
        category: "markets",
        company: "CNBC",
        description: "CNBC Markets feed (seeded by integration test)",
        isActive: true,
        name: TEST_FEED_NAME,
        url: TEST_FEED_URL,
      })
      .returning({ id: rssFeeds.id });

    if (!inserted) {
      throw new Error("Failed to seed test RSS feed");
    }
    testFeedId = inserted.id;
    console.log(`[test] seeded feed ${testFeedId} → ${TEST_FEED_URL}`);
  }, 30_000);

  afterAll(async () => {
    if (!testFeedId) {
      return;
    }
    // Remove articles that reference this feed. `feed_ids` is a jsonb array,
    // so we use the @> containment operator to find articles linked to us.
    // In local dev this is the only feed, so this effectively cleans up fully.
    await db
      .delete(rssArticles)
      .where(sql`${rssArticles.feedIds} @> ${JSON.stringify([testFeedId])}`);

    await db.delete(rssFeeds).where(eq(rssFeeds.id, testFeedId));
    console.log(`[test] cleaned up feed ${testFeedId} and its articles`);
  }, 30_000);

  it("fetches, parses, and stores articles from a real RSS feed", async () => {
    const run = await start(rssSyncWorkflow, []);
    const result = await run.returnValue;

    console.log(`[test] workflow returned: ${JSON.stringify(result)}`);

    // Workflow touched exactly our seeded feed (there are no others in local DB).
    expect(result.feedsProcessed).toBeGreaterThanOrEqual(1);
    expect(result.failedFeeds).toBe(0);
    // CNBC Markets has a steady stream of items — first run should insert many.
    expect(result.newArticles).toBeGreaterThan(0);

    // DB-level proof: articles linked to our feed actually exist.
    const storedForFeed = await db
      .select({ id: rssArticles.id, link: rssArticles.link })
      .from(rssArticles)
      .where(sql`${rssArticles.feedIds} @> ${JSON.stringify([testFeedId])}`);

    expect(storedForFeed).toHaveLength(result.newArticles);
    // Shape check on a sample row.
    const [sample] = storedForFeed;
    expect(sample).toBeDefined();
    expect(sample?.link).toMatch(/^https?:\/\//);

    // Feed's `last_fetched` should have been stamped.
    const [refreshed] = await db
      .select({ lastFetched: rssFeeds.lastFetched })
      .from(rssFeeds)
      .where(eq(rssFeeds.id, testFeedId));
    expect(refreshed?.lastFetched).toBeInstanceOf(Date);
  }, 120_000);

  it("second run dedupes — no new articles, links reused", async () => {
    // Capture state after the first run above.
    const beforeSecond = await db
      .select({ id: rssArticles.id })
      .from(rssArticles)
      .where(sql`${rssArticles.feedIds} @> ${JSON.stringify([testFeedId])}`);

    const run = await start(rssSyncWorkflow, []);
    const result = await run.returnValue;

    console.log(`[test] second run returned: ${JSON.stringify(result)}`);

    expect(result.failedFeeds).toBe(0);
    // Every item the feed returns was already stored & already linked to us,
    // so nothing new and nothing re-linked should happen.
    expect(result.newArticles).toBe(0);
    expect(result.reusedArticles).toBe(0);

    const afterSecond = await db
      .select({ id: rssArticles.id })
      .from(rssArticles)
      .where(sql`${rssArticles.feedIds} @> ${JSON.stringify([testFeedId])}`);

    // Row count unchanged proves idempotency at the DB level.
    expect(afterSecond).toHaveLength(beforeSecond.length);
  }, 120_000);
});
