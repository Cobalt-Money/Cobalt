import { db } from "@cobalt-web/db";
import { eventArticles, financialEvents } from "@cobalt-web/db/schema/features";
import type { FinancialEventInsert } from "@cobalt-web/db/schema/features";
import { eq, sql } from "drizzle-orm";

import { toEventArticleInsertRow } from "./lib.js";
import type { EventSummary, ProcessedArticle } from "./lib.js";

// Returns the database row id for the event (existing or newly created).
export async function upsertFinancialEventHeader(
  event: FinancialEventInsert
): Promise<string> {
  const [row] = await db
    .insert(financialEvents)
    .values(event)
    .onConflictDoUpdate({
      set: {
        date: sql`excluded.date`,
        eventName: sql`excluded.event_name`,
        eventText: sql`excluded.event_text`,
        newsItems: sql`excluded.news_items`,
        tickers: sql`excluded.tickers`,
        updatedAt: new Date(),
      },
      target: financialEvents.eventId,
    })
    .returning({ id: financialEvents.id });

  if (!row) {
    throw new Error(`Failed to upsert financial event ${event.eventId}`);
  }
  return row.id;
}

const ARTICLE_BATCH_SIZE = 100;

export async function replaceEventArticles(
  eventRecordId: string,
  processed: ProcessedArticle[]
): Promise<void> {
  await db
    .delete(eventArticles)
    .where(eq(eventArticles.financialEventId, eventRecordId));

  if (processed.length === 0) {
    return;
  }

  const rows = processed.map((p) => toEventArticleInsertRow(eventRecordId, p));
  for (let i = 0; i < rows.length; i += ARTICLE_BATCH_SIZE) {
    const batch = rows.slice(i, i + ARTICLE_BATCH_SIZE);
    await db.insert(eventArticles).values(batch);
  }
}

export async function applyEventSummary(
  eventRecordId: string,
  summary: EventSummary,
  scrapedArticlesCount: number
): Promise<void> {
  await db
    .update(financialEvents)
    .set({
      keyPoints: summary.keyPoints,
      scrapedArticlesCount,
      sentiment: summary.overallSentiment,
      summary: summary.eventSummary,
      topics: summary.topics,
      updatedAt: new Date(),
    })
    .where(eq(financialEvents.id, eventRecordId));
}
