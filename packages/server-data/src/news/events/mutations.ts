import { db } from "@cobalt-web/db";
import { financialEvents, eventArticles } from "@cobalt-web/db/schema/features";
import type {
  FinancialEventInsert,
  EventArticleInsert,
} from "@cobalt-web/db/schema/features";
import { eq } from "drizzle-orm";

// ============================================================================
// Financial Events - Primitive CRUD Operations
// ============================================================================

/**
 * Find a financial event by its external event_id.
 * Returns null if not found.
 */
export async function findEventByEventId(
  eventId: string
): Promise<{ id: string } | null> {
  const row = await db.query.financialEvents.findFirst({
    columns: { id: true },
    where: { eventId: { eq: eventId } },
  });

  return row ?? null;
}

/**
 * Insert a new financial event record.
 * Returns the created record's id.
 */
export async function insertFinancialEvent(
  data: FinancialEventInsert
): Promise<{ id: string }> {
  const [inserted] = await db
    .insert(financialEvents)
    .values(data)
    .returning({ id: financialEvents.id });

  if (!inserted) {
    throw new Error("Failed to insert financial event");
  }

  return inserted;
}

/**
 * Update an existing financial event by its internal id.
 */

export async function updateFinancialEvent(
  id: string,
  data: Partial<Omit<FinancialEventInsert, "eventId" | "createdAt">>
): Promise<void> {
  await db
    .update(financialEvents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(financialEvents.id, id));
}

// ============================================================================
// Event Articles - Primitive CRUD Operations
// ============================================================================

/**
 * Delete all articles associated with a financial event.
 */
export async function deleteArticlesByEventId(eventId: string): Promise<void> {
  await db
    .delete(eventArticles)
    .where(eq(eventArticles.financialEventId, eventId));
}

/**
 * Insert multiple articles for a financial event.
 */
export async function insertEventArticles(
  articles: EventArticleInsert[]
): Promise<void> {
  if (articles.length === 0) {
    return;
  }
  await db.insert(eventArticles).values(articles);
}

/**
 * Update a financial event's AI-generated summary fields.
 */
export async function updateEventSummary(
  eventId: string,
  summary: {
    eventSummary: string;
    keyPoints: string[];
    overallSentiment: "positive" | "negative" | "neutral" | "mixed";
    topics: string[];
    scrapedArticlesCount: number;
  }
): Promise<void> {
  await db
    .update(financialEvents)
    .set({
      keyPoints: summary.keyPoints,
      scrapedArticlesCount: summary.scrapedArticlesCount,
      sentiment: summary.overallSentiment,
      summary: summary.eventSummary,
      topics: summary.topics,
      updatedAt: new Date(),
    })
    .where(eq(financialEvents.id, eventId));
}
