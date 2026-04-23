/**
 * Prerequisites before running `bun run test:integration`:
 *   1. `bun run db:local:up` — local Postgres in docker
 *   2. `bun run db:migrate:local` — apply migrations
 *   3. Real `STOCK_NEWS_API_KEY` in apps/server/.env (RSS uses external feeds)
 */

import { describe, it, expect } from "vitest";
import { start } from "workflow/api";

import { rssSyncWorkflow } from "../../../src/workflows/news/rss/workflow.js";

describe("rssSyncWorkflow (sad-path integration)", () => {
  it("completes workflow when no active feeds exist", async () => {
    // Sad-path: database has no active RSS feeds configured yet
    // The workflow should gracefully return zero stats

    const run = await start(rssSyncWorkflow, []);

    // Workflow completes without crashing
    const result = await run.returnValue;

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      failedFeeds: 0,
      feedsProcessed: 0,
      newArticles: 0,
      reusedArticles: 0,
    });
  });
});
