import { z } from "@hono/zod-openapi";

// ── Shared ─────────────────────────────────────────────────────────

export const symbolQuerySchema = z.object({
  symbol: z.string().min(1).openapi({ example: "AAPL" }),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ── Quote ──────────────────────────────────────────────────────────

export const quoteResponseSchema = z.object({
  change: z.number(),
  changePercent: z.number(),
  companyName: z.string(),
  currentPrice: z.number(),
});

// ── Overview ───────────────────────────────────────────────────────

export const overviewResponseSchema = z
  .record(z.string(), z.unknown())
  .openapi({
    description: "Alpha Vantage company overview (all fields returned as-is)",
  });

// ── Chart ──────────────────────────────────────────────────────────

export const chartQuerySchema = z.object({
  interval: z
    .string()
    .optional()
    .openapi({ deprecated: true, description: "Deprecated — use timePeriod" }),
  symbol: z.string().min(1).openapi({ example: "AAPL" }),
  timePeriod: z
    .enum(["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "All"])
    .optional()
    .openapi({ example: "1D" }),
});

const priceDataSchema = z.object({
  close: z.number().optional(),
  high: z.number().optional(),
  id: z.string().optional(),
  low: z.number().optional(),
  open: z.number().optional(),
  price: z.number(),
  time: z.string(),
  volume: z.number(),
});

export const chartResponseSchema = z.object({
  data: z.array(priceDataSchema),
});

// ── Earnings ───────────────────────────────────────────────────────

export const earningsResponseSchema = z.object({
  earningsEstimates: z.unknown(),
  earningsHistory: z.unknown(),
});

// ── Income statement ───────────────────────────────────────────────

export const incomeStatementResponseSchema = z
  .record(z.string(), z.unknown())
  .openapi({
    description: "Alpha Vantage income statement (all fields returned as-is)",
  });

// ── Balance sheet ──────────────────────────────────────────────────

export const balanceSheetResponseSchema = z
  .record(z.string(), z.unknown())
  .openapi({
    description: "Alpha Vantage balance sheet (all fields returned as-is)",
  });

// ── News ───────────────────────────────────────────────────────────

export const newsResponseSchema = z.object({
  data: z.array(z.unknown()),
  total_items: z.number(),
  total_pages: z.number(),
});
