import { z } from "@hono/zod-openapi";

export { errorResponseSchema } from "../_shared/schemas.js";

// ── Search ─────────────────────────────────────────────────────────

export const tickerSearchItemSchema = z
  .object({
    active: z.boolean(),
    currency: z.string(),
    name: z.string(),
    region: z.string(),
    symbol: z.string(),
    type: z.string(),
  })
  .openapi("TickerSearchResult");

export const tickerSearchResponseSchema = z
  .object({
    count: z.number(),
    tickers: z.array(tickerSearchItemSchema),
  })
  .openapi("TickersSearchResponse");
