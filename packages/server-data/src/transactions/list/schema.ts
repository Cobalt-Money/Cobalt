import { z } from "@hono/zod-openapi";

import { transactionResponseSchema } from "../detail/schema.js";

export const getTransactionsSchema = z.object({
  accountId: z
    .union([z.uuid(), z.array(z.uuid())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  accountSubtype: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  accountType: z.string().optional(),
  categoryGroup: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  categoryId: z
    .union([z.uuid(), z.array(z.uuid())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  cursor: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  maxAmount: z.coerce.number().optional(),
  minAmount: z.coerce.number().optional(),
  pendingFilter: z.enum(["true", "false"]).optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
  tagId: z
    .union([z.uuid(), z.array(z.uuid())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
});

export const transactionsResponseSchema = z
  .object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    transactions: z.array(transactionResponseSchema),
  })
  .openapi("TransactionsResponse");
