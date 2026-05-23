import { z } from "@hono/zod-openapi";

export const spendingBucketSchema = z
  .object({ amount: z.number(), date: z.string() })
  .openapi("SpendingBucket");

export const spendingResponseSchema = z
  .object({
    averageLabel: z.enum(["daily", "weekly", "monthly", "yearly"]),
    averageSpending: z.number(),
    spending: z.array(spendingBucketSchema),
    totalSpending: z.number(),
  })
  .openapi("CreditSpendingResponse");

export const getSpendingSchema = z.object({
  accountId: z.string().optional(),
  accountType: z.enum(["credit", "depository", "all"]).default("all"),
  period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
});
