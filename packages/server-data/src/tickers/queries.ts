import { alphaVantageRequest } from "@cobalt-web/clients/alpha-vantage";
import { db } from "@cobalt-web/db";

import { normalizeTickerForAlphaVantage } from "../research/lib.js";
import { dbTickerToSearchItem, extractPrice } from "./lib.js";
import type { TickerPrice, TickerSearchItem } from "./lib.js";

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
