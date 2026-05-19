import { db } from "@cobalt-web/db";
import { rssArticles, rssFeeds } from "@cobalt-web/db/schema/news";
import { and, desc, eq, sql } from "drizzle-orm";

import type { RssArticleDTO, RssQueryResult } from "./schemas.js";

// ── Helpers ───────────────────────────────────────────────────────

const toISOStringOrNull = (val: Date | null): string | null => (val ? val.toISOString() : null);

// ── Query ─────────────────────────────────────────────────────────

export async function getRssArticles(
  _userId: string,
  options: {
    category?: string;
    company?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<RssQueryResult> {
  const { category, company, limit = 15, offset = 0 } = options;

  // Build WHERE conditions
  const conditions = [eq(rssFeeds.isActive, true)];

  if (company) {
    conditions.push(eq(rssFeeds.company, company));
  }
  if (category) {
    conditions.push(eq(rssFeeds.category, category));
  }

  // Fetch articles joined with feeds
  const rows = await db
    .selectDistinct({
      createdAt: rssArticles.createdAt,
      description: rssArticles.description,
      feedIds: rssArticles.feedIds,
      id: rssArticles.id,
      link: rssArticles.link,
      metadata: rssArticles.metadata,
      publishedDate: rssArticles.publishedDate,
      title: rssArticles.title,
    })
    .from(rssArticles)
    .innerJoin(rssFeeds, sql`${rssArticles.feedIds} @> to_jsonb(${rssFeeds.id})`)
    .where(and(...conditions))
    .orderBy(desc(rssArticles.publishedDate), desc(rssArticles.createdAt))
    .limit(limit)
    .offset(offset);

  // For each article, fetch its associated feeds
  const articles: RssArticleDTO[] = [];

  for (const row of rows) {
    const feedIds = row.feedIds as string[];

    const feeds =
      feedIds.length > 0
        ? await db.query.rssFeeds.findMany({
            columns: {
              category: true,
              company: true,
              description: true,
              id: true,
              name: true,
            },
            where: { id: { in: feedIds } },
          })
        : [];

    articles.push({
      createdAt: row.createdAt.toISOString(),
      description: row.description,
      feedIds,
      feeds,
      id: row.id,
      link: row.link,
      metadata: row.metadata,
      publishedDate: toISOStringOrNull(row.publishedDate),
      title: row.title,
    });
  }

  // Fetch unique companies and categories from active feeds
  const activeFeeds = await db.query.rssFeeds.findMany({
    columns: { category: true, company: true },
    where: { isActive: { eq: true } },
  });

  const companies = [...new Set(activeFeeds.map((f) => f.company))].toSorted();
  const categories = [...new Set(activeFeeds.map((f) => f.category))].toSorted();

  return { articles, categories, companies };
}
