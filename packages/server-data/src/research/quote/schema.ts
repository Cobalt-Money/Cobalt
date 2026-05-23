import { z } from "@hono/zod-openapi";

export { symbolQuerySchema } from "../_shared/schema.js";

export const quoteResponseSchema = z
  .object({
    change: z.number(),
    changePercent: z.number(),
    companyName: z.string(),
    currentPrice: z.number(),
  })
  .openapi("Quote");

export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
