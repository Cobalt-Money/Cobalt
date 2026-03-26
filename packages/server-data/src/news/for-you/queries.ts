import { db } from "@cobalt-web/db";

import {
  decodeCursorForYou,
  encodeCursorForYou,
  transformFinancialEventsForUI,
} from "../lib.js";
import type { ForYouResult } from "./schemas.js";

// ── Get user stock tickers ─────────────────────────────────────────

export async function getUserStockTickers(userId: string): Promise<string[]> {
  const rows = await db.query.brokeragePositions.findMany({
    columns: { rawSymbol: true, symbol: true },
    where: {
      RAW: (t, { sql }) =>
        sql`${t.userId} = ${userId} AND (${t.symbol} IS NOT NULL OR ${t.rawSymbol} IS NOT NULL)`,
    },
  });

  const tickers = new Set<string>();
  for (const row of rows) {
    const ticker = row.symbol ?? row.rawSymbol;
    if (ticker) {
      tickers.add(ticker);
    }
  }

  return [...tickers];
}

// ── Get financial events for tickers ───────────────────────────────

export async function getFinancialEventsForTickers(
  _userId: string,
  tickers: string[],
  limit: number,
  cursor?: string,
  topic?: string
): Promise<ForYouResult> {
  const decoded = cursor ? decodeCursorForYou(cursor) : null;

  const events = await db.query.financialEvents.findMany({
    limit: limit + 1,
    orderBy: { createdAt: "desc", id: "desc" },
    where: {
      RAW: (t, { sql, lt, eq }) => {
        const parts = [
          sql`${t.tickers} ?| array[${sql.join(
            tickers.map((ticker) => sql`${ticker}`),
            sql`, `
          )}]`,
        ];

        if (topic) {
          parts.push(sql`${t.topics} @> ${JSON.stringify([topic])}::jsonb`);
        }

        if (decoded) {
          parts.push(
            sql`(${lt(t.createdAt, new Date(decoded.createdAt))} OR (${eq(t.createdAt, new Date(decoded.createdAt))} AND ${lt(t.id, decoded.id)}))`
          );
        }

        return sql.join(parts, sql` AND `);
      },
    },
    with: { articles: true },
  });

  const hasMore = events.length > limit;
  const sliced = events.slice(0, limit);

  let nextCursor: string | undefined;
  const lastEvent = sliced.at(-1);
  if (hasMore && lastEvent) {
    nextCursor = encodeCursorForYou(lastEvent.createdAt, lastEvent.id);
  }

  return {
    events: transformFinancialEventsForUI(sliced),
    hasMore,
    nextCursor,
  };
}
