import { z } from "@hono/zod-openapi";

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

export const priceDataSchema = z
  .object({
    close: z.number().optional(),
    high: z.number().optional(),
    id: z.string().optional(),
    low: z.number().optional(),
    open: z.number().optional(),
    price: z.number(),
    time: z.string().openapi({ example: "2025-05-13T14:30:00.000Z", format: "date-time" }),
    volume: z.number(),
  })
  .openapi("ChartPoint");

export const chartResponseSchema = z
  .object({
    data: z.array(priceDataSchema),
  })
  .openapi("ChartResponse");

export type ChartResponse = z.infer<typeof chartResponseSchema>;
