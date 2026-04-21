import { db } from "@cobalt-web/db";
import { financialEvents } from "@cobalt-web/db/schema/features";
import { eq as drizzleEq, inArray } from "drizzle-orm";

import {
  decodeCursor,
  encodeCursor,
  transformFinancialEventsForUI,
} from "../lib.js";
import type { PaginatedEventsResult } from "./schemas.js";

// ── Query ─────────────────────────────────────────────────────────

export const getFinancialEventsWithArticles = async (
  _userId: string,
  limit = 20,
  cursor?: string,
  topic?: string
): Promise<PaginatedEventsResult> => {
  const decoded = cursor ? decodeCursor(cursor) : null;

  const events = await db.query.financialEvents.findMany({
    limit: limit + 1,
    orderBy: { date: "desc", id: "desc" },
    where: {
      RAW: (t, { sql, isNotNull, lt, eq }) => {
        const parts = [isNotNull(t.date)];

        if (topic) {
          parts.push(sql`${t.topics} @> ${JSON.stringify([topic])}::jsonb`);
        }

        if (decoded?.date) {
          parts.push(
            sql`(${lt(t.date, new Date(decoded.date))} OR (${eq(t.date, new Date(decoded.date))} AND ${lt(t.id, decoded.id)}))`
          );
        }

        return sql.join(parts, sql` AND `);
      },
    },
    with: { articles: true },
  });

  const hasMore = events.length > limit;
  const sliced = events.slice(0, limit);

  const lastEvent = sliced.at(-1);
  const nextCursor =
    hasMore && lastEvent
      ? encodeCursor(lastEvent.date, lastEvent.id)
      : undefined;

  return {
    events: transformFinancialEventsForUI(sliced),
    hasMore,
    nextCursor,
  };
};

// ── Processed-event checks (used by the cron to skip already-summarized events)

export async function listProcessedEventIds(
  eventIds: string[]
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set<string>();
  }
  const rows = await db
    .select({
      eventId: financialEvents.eventId,
      scrapedArticlesCount: financialEvents.scrapedArticlesCount,
      summary: financialEvents.summary,
    })
    .from(financialEvents)
    .where(inArray(financialEvents.eventId, eventIds));

  return new Set(
    rows
      .filter((r) => r.summary && r.scrapedArticlesCount > 0)
      .map((r) => r.eventId)
  );
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const [row] = await db
    .select({
      scrapedArticlesCount: financialEvents.scrapedArticlesCount,
      summary: financialEvents.summary,
    })
    .from(financialEvents)
    .where(drizzleEq(financialEvents.eventId, eventId))
    .limit(1);
  return Boolean(row?.summary && row.scrapedArticlesCount > 0);
}
