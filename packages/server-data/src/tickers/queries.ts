import { alphaVantageRequest } from "@cobalt-web/clients/alpha-vantage";
import { getAllTickers } from "@cobalt-web/clients/twelve-data";

import { normalizeTickerForAlphaVantage } from "../research/lib.js";
import { extractPrice, toTickerSearchItem } from "./lib.js";
import type { TickerPrice, TickerSearchItem } from "./lib.js";

// ── Search ─────────────────────────────────────────────────────────

export async function searchTickers(): Promise<TickerSearchItem[]> {
  const raw = await getAllTickers(["NASDAQ", "NYSE"]);
  return raw.map(toTickerSearchItem);
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
