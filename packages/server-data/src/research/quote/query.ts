import { fmpStableGet } from "@cobalt-web/clients/fmp";

import { ApiError } from "../../_shared/api-error.js";
import { firstObject, num, str } from "../_shared/parse.js";
import { withFmpUpstream } from "../_shared/fmp-upstream.js";
import type { QuoteResponse } from "./schema.js";

export async function getQuote(symbol: string): Promise<QuoteResponse> {
  const raw = await withFmpUpstream(() => fmpStableGet("batch-quote", { symbols: symbol }));
  const arr = Array.isArray(raw) ? raw : [];
  const item = firstObject(arr[0] ?? raw);

  if (!item) {
    throw new ApiError(404, "ticker_not_found", `No quote data available for ${symbol}`);
  }

  return {
    change: num(item.change) ?? 0,
    changePercent: num(item.changesPercentage ?? item.changePercentage) ?? 0,
    companyName: str(item.name) ?? str(item.companyName) ?? symbol,
    currentPrice: num(item.price) ?? 0,
  };
}
