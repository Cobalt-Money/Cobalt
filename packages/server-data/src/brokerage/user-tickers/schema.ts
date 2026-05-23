import { z } from "@hono/zod-openapi";

export const userTickersResponseSchema = z.object({
  tickers: z.array(z.string()),
});

export type UserTickersResponse = z.infer<typeof userTickersResponseSchema>;
