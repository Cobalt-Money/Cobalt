import { z } from "@hono/zod-openapi";

import { transactionResponseSchema } from "../detail/schema.js";

// Domain contract — pure, JSON-Schema serializable. Used by bindings/MCP/internal callers.
export const getTransactionsSchema = z.object({
  accountId: z.array(z.uuid()).optional(),
  accountSubtype: z.array(z.string()).optional(),
  accountType: z.string().optional(),
  categoryGroup: z.array(z.string()).optional(),
  categoryId: z.array(z.uuid()).optional(),
  cursor: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  maxAmount: z.coerce.number().optional(),
  minAmount: z.coerce.number().optional(),
  pendingFilter: z.enum(["true", "false"]).optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
  tagId: z.array(z.uuid()).optional(),
});

// HTTP query-string variant: coerces single value to array (?accountId=x → ["x"]).
const arrayOf = <T extends z.ZodTypeAny>(item: T) =>
  z.union([item, z.array(item)]).transform((v) => (Array.isArray(v) ? v : [v]));

export const getTransactionsQuerySchema = getTransactionsSchema.extend({
  accountId: arrayOf(z.uuid()).optional(),
  accountSubtype: arrayOf(z.string()).optional(),
  categoryGroup: arrayOf(z.string()).optional(),
  categoryId: arrayOf(z.uuid()).optional(),
  tagId: arrayOf(z.uuid()).optional(),
});

export const transactionsResponseSchema = z
  .object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    transactions: z.array(transactionResponseSchema),
  })
  .openapi("TransactionsResponse");
