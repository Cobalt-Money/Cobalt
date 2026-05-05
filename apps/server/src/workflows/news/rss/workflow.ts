import { sleep } from "workflow";

import { listActiveFeedsStep, processFeedStep } from "./steps.js";
import type { FeedProcessStats } from "./steps.js";

export interface RssSyncWorkflowResult {
  feedsProcessed: number;
  newArticles: number;
  reusedArticles: number;
  failedFeeds: number;
}

// 1s delay between feeds so we stay polite to origin RSS hosts (CNBC, Bloomberg, …).
const BETWEEN_FEED_DELAY = "1s";

export async function rssSyncWorkflow(): Promise<RssSyncWorkflowResult> {
  "use workflow";

  const feeds = await listActiveFeedsStep();
  const stats: FeedProcessStats[] = [];

  for (const [i, feed] of feeds.entries()) {
    const stat = await processFeedStep(feed);
    stats.push(stat);
    if (i < feeds.length - 1) {
      await sleep(BETWEEN_FEED_DELAY);
    }
  }

  return {
    failedFeeds: stats.filter((s) => !s.success).length,
    feedsProcessed: stats.length,
    newArticles: stats.reduce((sum, s) => sum + s.newArticles, 0),
    reusedArticles: stats.reduce((sum, s) => sum + s.reusedArticles, 0),
  };
}
