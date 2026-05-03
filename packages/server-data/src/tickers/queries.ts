import { db } from "@cobalt-web/db";

import { dbTickerToSearchItem } from "./lib.js";
import type { TickerSearchItem } from "./lib.js";

// ── Search ─────────────────────────────────────────────────────────

export async function searchTickers(): Promise<TickerSearchItem[]> {
  const rows = await db.query.tickers.findMany({
    where: {
      exchange: { in: ["NASDAQ", "NYSE"] },
      isActive: { eq: true },
    },
  });
  return rows.map(dbTickerToSearchItem);
}
