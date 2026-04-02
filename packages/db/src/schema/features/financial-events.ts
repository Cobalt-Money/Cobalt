import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

import { appFullAccess, agentSelectPublic } from "../rls";

// Financial Events table - stores events from Stock News API
export const financialEvents = pgTable.withRLS(
  "financial_events",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    date: timestamp("date"),
    eventId: varchar("event_id").notNull().unique(),
    eventName: text("event_name").notNull(),
    eventText: text("event_text"),
    id: uuid("id").defaultRandom().primaryKey(),
    keyPoints: jsonb("key_points"),
    newsItems: integer("news_items").default(0).notNull(),
    scrapedArticlesCount: integer("scraped_articles_count")
      .default(0)
      .notNull(),
    sentiment: varchar("sentiment"),
    summary: text("summary"),
    tickers: jsonb("tickers"),
    topics: jsonb("topics").default(["other"]),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("financial_events_event_id_idx").on(table.eventId),
    index("financial_events_date_idx").on(table.date),
    index("financial_events_created_at_idx").on(table.createdAt),
    index("financial_events_sentiment_idx").on(table.sentiment),
    index("financial_events_date_id_idx").on(table.date, table.id),
    index("financial_events_created_at_id_idx").on(table.createdAt, table.id),
    index("financial_events_tickers_idx").using("gin", table.tickers),
    appFullAccess(),
    agentSelectPublic(),
  ]
);

// Event Articles table
export const eventArticles = pgTable.withRLS(
  "event_articles",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    date: timestamp("date"),
    financialEventId: uuid("financial_event_id")
      .references(() => financialEvents.id, { onDelete: "cascade" })
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    imageUrl: text("image_url"),
    newsUrl: text("news_url").notNull(),
    sentiment: varchar("sentiment"),
    sourceName: varchar("source_name"),
    text: text("text"),
    tickers: jsonb("tickers"),
    title: text("title").notNull(),
    topics: jsonb("topics"),
    type: varchar("type"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("event_articles_financial_event_id_idx").on(table.financialEventId),
    index("event_articles_news_url_idx").on(table.newsUrl),
    index("event_articles_source_name_idx").on(table.sourceName),
    index("event_articles_date_idx").on(table.date),
    appFullAccess(),
    agentSelectPublic(),
  ]
);

// Type exports
export type FinancialEvent = typeof financialEvents.$inferSelect;
export type FinancialEventInsert = typeof financialEvents.$inferInsert;
export type EventArticle = typeof eventArticles.$inferSelect;
export type EventArticleInsert = typeof eventArticles.$inferInsert;
