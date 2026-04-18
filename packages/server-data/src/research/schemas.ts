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

// ── Overview (FMP profile, normalized in `fmpGetProfile`) ───────────

/** Normalized company profile returned by `fmpGetProfile` in `fmp-ticker.ts`. */
export const fmpProfileSchema = z.object({
  beta: z.number().nullable(),
  ceo: z.string().nullable(),
  companyName: z.string(),
  country: z.string().nullable(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  dividendYield: z.number().nullable(),
  exchange: z.string().nullable(),
  fullTimeEmployees: z.number().nullable(),
  industry: z.string().nullable(),
  ipoDate: z.string().nullable(),
  marketCap: z.number().nullable(),
  pe: z.number().nullable(),
  price: z.number().nullable(),
  revenue: z.number().nullable(),
  sector: z.string().nullable(),
  symbol: z.string(),
  website: z.string().nullable(),
});

export type FmpProfile = z.infer<typeof fmpProfileSchema>;

export const overviewResponseSchema = fmpProfileSchema.openapi({
  description:
    "Normalized FMP company profile (stable `/profile` + optional P/E and revenue enrichment).",
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

// ── Stock screener (FMP company-screener) ───────────────────────────

export const screenerQuerySchema = z.object({
  betaLowerThan: z.coerce.number().optional().openapi({ example: 2 }),
  betaMoreThan: z.coerce.number().optional().openapi({ example: 0.5 }),
  country: z.string().min(1).optional().openapi({ example: "US" }),
  dividendLowerThan: z.coerce.number().optional(),
  dividendMoreThan: z.coerce.number().optional(),
  exchange: z.string().min(1).optional().openapi({
    description:
      "Ignored — this endpoint always returns NASDAQ and NYSE listings only.",
    example: "NASDAQ",
  }),
  industry: z.string().min(1).optional(),
  isActivelyTrading: z
    .enum(["true", "false"])
    .optional()
    .openapi({ description: "Filter actively trading names" }),
  isEtf: z
    .enum(["true", "false"])
    .optional()
    .openapi({ description: "ETF-only filter" }),
  limit: z.coerce.number().int().min(1).max(10_000).optional().openapi({
    example: 50,
  }),
  marketCapLowerThan: z.coerce.number().optional(),
  marketCapMoreThan: z.coerce.number().optional(),
  priceLowerThan: z.coerce.number().optional(),
  priceMoreThan: z.coerce.number().optional(),
  sector: z.string().min(1).optional().openapi({ example: "Technology" }),
  volumeLowerThan: z.coerce.number().optional(),
  volumeMoreThan: z.coerce.number().optional(),
});

export const screenerRowSchema = z.record(z.string(), z.unknown());

export const screenerResponseSchema = z.object({
  count: z.number(),
  results: z.array(screenerRowSchema),
});
