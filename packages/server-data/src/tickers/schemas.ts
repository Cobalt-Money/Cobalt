import { z } from "@hono/zod-openapi";

// ── Shared ─────────────────────────────────────────────────────────

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ── Search ─────────────────────────────────────────────────────────

const tickerSearchItemSchema = z.object({
  active: z.boolean(),
  currency: z.string(),
  name: z.string(),
  region: z.string(),
  symbol: z.string(),
  type: z.string(),
});

export const tickerSearchResponseSchema = z.object({
  count: z.number(),
  tickers: z.array(tickerSearchItemSchema),
});

// ── Price ──────────────────────────────────────────────────────────

export const symbolParamSchema = z.object({
  symbol: z.string().min(1).openapi({ example: "AAPL" }),
});

export const tickerPriceResponseSchema = z.object({
  price: z.number(),
  symbol: z.string(),
  timestamp: z.string(),
});
