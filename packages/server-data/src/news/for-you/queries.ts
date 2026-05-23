import { db } from "@cobalt-web/db";
import { holding } from "@cobalt-web/db/schema/accounts/investments/holding";
import { security } from "@cobalt-web/db/schema/accounts/investments/security";
import { and, eq, isNotNull } from "drizzle-orm";

import { decodeCursorForYou, encodeCursorForYou, transformFinancialEventsForUI } from "../lib.js";
import type { ForYouResult } from "./schemas.js";

// ── Get user stock tickers ─────────────────────────────────────────

/** Distinct tickers from all the user's holdings (Plaid + SnapTrade unified). */
export async function getHoldingsTickers(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ ticker: security.tickerSymbol })
    .from(holding)
    .innerJoin(security, eq(holding.securityId, security.id))
    .where(and(eq(holding.userId, userId), isNotNull(security.tickerSymbol)));

  const tickers = new Set<string>();
  for (const row of rows) {
    if (row.ticker) {
      tickers.add(row.ticker);
    }
  }
  return [...tickers];
}

// ── Get financial events for tickers ───────────────────────────────

export async function getEventsForTickers(
  _userId: string,
  tickers: string[],
  limit: number,
  cursor?: string,
  topic?: string,
): Promise<ForYouResult> {
  const decoded = cursor ? decodeCursorForYou(cursor) : null;

  const events = await db.query.financialEvents.findMany({
    limit: limit + 1,
    orderBy: { createdAt: "desc", id: "desc" },
    where: {
      RAW: (t, { sql, lt, eq: eqOp }) => {
        const parts = [
          sql`${t.tickers} ?| array[${sql.join(
            tickers.map((ticker) => sql`${ticker}`),
            sql`, `,
          )}]`,
        ];

        if (topic) {
          parts.push(sql`${t.topics} @> ${JSON.stringify([topic])}::jsonb`);
        }

        if (decoded) {
          parts.push(
            sql`(${lt(t.createdAt, new Date(decoded.createdAt))} OR (${eqOp(t.createdAt, new Date(decoded.createdAt))} AND ${lt(t.id, decoded.id)}))`,
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
