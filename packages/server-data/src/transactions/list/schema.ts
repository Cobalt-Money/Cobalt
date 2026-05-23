import { z } from "@hono/zod-openapi";

import { transactionResponseSchema } from "../detail/schema.js";

export const getTransactionsSchema = z.object({
  accountType: z.string().optional(),
  cursor: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  maxAmount: z.coerce.number().optional(),
  minAmount: z.coerce.number().optional(),
  pendingFilter: z.enum(["true", "false"]).optional(),
  primaryCategory: z.string().optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
});

export const transactionsResponseSchema = z
  .object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    transactions: z.array(transactionResponseSchema),
  })
  .openapi("TransactionsResponse");
