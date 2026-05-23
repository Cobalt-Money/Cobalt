import { z } from "@hono/zod-openapi";

export const tickerHistoryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .openapi({ description: "Reference date YYYY-MM-DD", example: "2023-06-15" }),
  symbol: z.string().min(1).openapi({ example: "AAPL" }),
  window: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .openapi({ description: "Calendar days on each side of date (default 7)" }),
});

export const tickerHistoryPointSchema = z
  .object({
    close: z.number(),
    date: z.string(),
    high: z.number(),
    low: z.number(),
  })
  .openapi("TickerHistoryPoint");

export const tickerHistoryResponseSchema = z
  .object({
    points: z.array(tickerHistoryPointSchema),
    requested: z.string(),
    symbol: z.string(),
  })
  .openapi("TickerHistoryResponse");

export type TickerHistoryResponse = z.infer<typeof tickerHistoryResponseSchema>;
