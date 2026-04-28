import { db } from "@cobalt-web/db";
import { rssArticles, rssFeeds } from "@cobalt-web/db/schema/news";
import type { RssFeed } from "@cobalt-web/db/schema/news";
import { eq } from "drizzle-orm";

export interface ProcessRssItemInput {
  feedId: string;
  link: string;
  title: string;
  description?: string | null;
  publishedDate?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProcessRssItemResult {
  inserted: boolean;
  alreadyLinked: boolean;
}

// Inserts a new article or appends this feedId to an existing matching article.
// Returns whether we created a new row (for cron statistics).
export async function upsertRssArticleForFeed(
  input: ProcessRssItemInput
): Promise<ProcessRssItemResult> {
  const [existing] = await db
    .select({ feedIds: rssArticles.feedIds, id: rssArticles.id })
    .from(rssArticles)
    .where(eq(rssArticles.link, input.link))
    .limit(1);

  if (existing) {
    const currentIds = (existing.feedIds as string[] | null) ?? [];
    if (currentIds.includes(input.feedId)) {
      return { alreadyLinked: true, inserted: false };
    }
    await db
      .update(rssArticles)
      .set({
        feedIds: [...currentIds, input.feedId],
        updatedAt: new Date(),
      })
      .where(eq(rssArticles.id, existing.id));
    return { alreadyLinked: false, inserted: false };
  }

  await db.insert(rssArticles).values({
    description: input.description ?? null,
    feedIds: [input.feedId],
    link: input.link,
    metadata: input.metadata ?? null,
    publishedDate: input.publishedDate ?? null,
    title: input.title,
  });

  return { alreadyLinked: false, inserted: true };
}

export function listActiveRssFeeds(): Promise<RssFeed[]> {
  return db.select().from(rssFeeds).where(eq(rssFeeds.isActive, true));
}

export async function markFeedFetched(feedId: string): Promise<void> {
  await db
    .update(rssFeeds)
    .set({ lastFetched: new Date(), updatedAt: new Date() })
    .where(eq(rssFeeds.id, feedId));
}
