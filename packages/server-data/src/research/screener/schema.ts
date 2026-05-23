import { z } from "@hono/zod-openapi";

export const screenerQuerySchema = z.object({
  betaLowerThan: z.coerce.number().optional().openapi({ example: 2 }),
  betaMoreThan: z.coerce.number().optional().openapi({ example: 0.5 }),
  country: z.string().min(1).optional().openapi({ example: "US" }),
  dividendLowerThan: z.coerce.number().optional(),
  dividendMoreThan: z.coerce.number().optional(),
  exchange: z.string().min(1).optional().openapi({
    description: "Ignored — this endpoint always returns NASDAQ and NYSE listings only.",
    example: "NASDAQ",
  }),
  industry: z.string().min(1).optional(),
  isActivelyTrading: z
    .enum(["true", "false"])
    .optional()
    .openapi({ description: "Filter actively trading names" }),
  isEtf: z.enum(["true", "false"]).optional().openapi({ description: "ETF-only filter" }),
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

export const screenerRowSchema = z
  .object({
    beta: z.number().nullable().optional(),
    companyName: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    exchange: z.string().nullable().optional(),
    exchangeShortName: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    isActivelyTrading: z.boolean().nullable().optional(),
    isEtf: z.boolean().nullable().optional(),
    marketCap: z.number().nullable().optional(),
    peRatio: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    revenue: z.number().nullable().optional(),
    sector: z.string().nullable().optional(),
    symbol: z.string(),
    volume: z.number().nullable().optional(),
  })
  .loose()
  .openapi("ScreenerRow");

export const screenerResponseSchema = z.object({
  count: z.number(),
  results: z.array(screenerRowSchema),
});

export type ScreenerRow = z.infer<typeof screenerRowSchema>;
export type ScreenerResponse = z.infer<typeof screenerResponseSchema>;
