import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const rssArticles = pgTable(
  "rss_articles",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    feedIds: jsonb("feed_ids").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    link: text("link").notNull().unique(),
    metadata: jsonb("metadata"),
    publishedDate: timestamp("published_date"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("rss_articles_link_where_idx").on(table.link),
    index("rss_articles_published_date_idx").on(table.publishedDate),
    index("rss_articles_created_at_idx").on(table.createdAt),
  ]
);

export const rssFeeds = pgTable(
  "rss_feeds",
  {
    category: text("category").notNull(),
    company: text("company").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    fetchIntervalMinutes: varchar("fetch_interval_minutes").default("5"),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    lastFetched: timestamp("last_fetched"),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    url: text("url").notNull().unique(),
  },
  (table) => [
    index("rss_feeds_company_idx").on(table.company),
    index("rss_feeds_category_idx").on(table.category),
    index("rss_feeds_company_category_idx").on(table.company, table.category),
    index("rss_feeds_url_idx").on(table.url),
    index("rss_feeds_is_active_idx").on(table.isActive),
    index("rss_feeds_last_fetched_idx").on(table.lastFetched),
  ]
);

// Type exports
export type RssArticle = typeof rssArticles.$inferSelect;
export type RssArticleInsert = typeof rssArticles.$inferInsert;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type RssFeedInsert = typeof rssFeeds.$inferInsert;
