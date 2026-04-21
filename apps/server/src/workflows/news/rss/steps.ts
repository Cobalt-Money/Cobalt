import type { RssFeed } from "@cobalt-web/db/schema/features";
import {
  buildItemMetadata,
  fetchRssFeedXml,
  parseDate,
  parseRssXml,
} from "@cobalt-web/server-data/news/rss/actions";
import type { RssItem } from "@cobalt-web/server-data/news/rss/actions";
import {
  listActiveRssFeeds,
  markFeedFetched,
  upsertRssArticleForFeed,
} from "@cobalt-web/server-data/news/rss/mutations";
import { RetryableError } from "workflow";

export interface FeedProcessStats {
  feedId: string;
  feedName: string;
  newArticles: number;
  reusedArticles: number;
  skippedArticles: number;
  success: boolean;
  error?: string;
}

export async function listActiveFeedsStep(): Promise<RssFeed[]> {
  "use step";
  return await listActiveRssFeeds();
}

export async function processFeedStep(
  feed: RssFeed
): Promise<FeedProcessStats> {
  "use step";

  let xml: string;
  try {
    xml = await fetchRssFeedXml(feed.url);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/timeout|ECONNRESET|ETIMEDOUT|ENETUNREACH/i.test(msg)) {
      throw new RetryableError(`RSS fetch network error: ${msg}`, {
        retryAfter: "30s",
      });
    }
    return {
      error: msg,
      feedId: feed.id,
      feedName: feed.name,
      newArticles: 0,
      reusedArticles: 0,
      skippedArticles: 0,
      success: false,
    };
  }

  const parsed = parseRssXml(xml);
  if (!parsed) {
    return {
      error: "Failed to parse RSS XML",
      feedId: feed.id,
      feedName: feed.name,
      newArticles: 0,
      reusedArticles: 0,
      skippedArticles: 0,
      success: false,
    };
  }

  let newArticles = 0;
  let reusedArticles = 0;
  let skippedArticles = 0;

  for (const item of parsed.items) {
    const result = await tryUpsertItem(feed.id, item);
    if (result === "new") {
      newArticles += 1;
    } else if (result === "linked") {
      reusedArticles += 1;
    } else {
      skippedArticles += 1;
    }
  }

  await markFeedFetched(feed.id);

  return {
    feedId: feed.id,
    feedName: feed.name,
    newArticles,
    reusedArticles,
    skippedArticles,
    success: true,
  };
}

async function tryUpsertItem(
  feedId: string,
  item: RssItem
): Promise<"new" | "linked" | "skipped"> {
  try {
    const result = await upsertRssArticleForFeed({
      description: item.description ?? null,
      feedId,
      link: item.link,
      metadata: buildItemMetadata(item),
      publishedDate: parseDate(item.pubDate),
      title: item.title,
    });
    if (result.inserted) {
      return "new";
    }
    if (!result.alreadyLinked) {
      return "linked";
    }
    return "skipped";
  } catch {
    return "skipped";
  }
}
