import { alphaVantageRequest } from "@cobalt-web/clients/alpha-vantage";
import { db } from "@cobalt-web/db";
import { tickers } from "@cobalt-web/db/schema/research/tickers";
import { and, eq, inArray } from "drizzle-orm";

import { normalizeTickerForAlphaVantage } from "../research/lib.js";
import { dbTickerToSearchItem, extractPrice } from "./lib.js";
import type { TickerPrice, TickerSearchItem } from "./lib.js";

// ── Search ─────────────────────────────────────────────────────────

export async function searchTickers(): Promise<TickerSearchItem[]> {
  const rows = await db
    .select()
    .from(tickers)
    .where(
      and(
        eq(tickers.isActive, true),
        inArray(tickers.exchange, ["NASDAQ", "NYSE"])
      )
    );
  return rows.map(dbTickerToSearchItem);
}

// ── Price ──────────────────────────────────────────────────────────

export async function getTickerPrice(symbol: string): Promise<TickerPrice> {
  const raw = await alphaVantageRequest({
    function: "GLOBAL_QUOTE",
    symbol: normalizeTickerForAlphaVantage(symbol),
  });

  const price = extractPrice(raw);

  if (price === null) {
    throw new Error("Quote data not available");
  }

  return {
    price,
    symbol: symbol.toUpperCase(),
    timestamp: new Date().toISOString(),
  };
}
