import { db } from "@cobalt-web/db";

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
