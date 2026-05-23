import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import {
  NO_MATCH_ID,
  recurringForUser,
  spendingTransactionsForUser,
  transactionsForUser,
} from "./lib.js";

const listArgsSchema = z
  .object({
    amount: z.enum(["all", "income", "expense"]).optional(),
    amountMax: z.number().nonnegative().optional(),
    amountMin: z.number().nonnegative().optional(),
    bank: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    status: z.enum(["all", "pending", "posted"]).optional(),
    tagIds: z.array(z.string()).optional(),
  })
  .optional();

/** Transaction-related named queries (`queries.transactions.*`). Composed in root `queries.ts`. */
export const transactionsQueries = {
  activity: defineQuery(z.object({ transactionId: z.string() }), ({ ctx, args }) =>
    zql.transactionEdit
      .where("transactionId", args.transactionId)
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .orderBy("createdAt", "asc"),
  ),

  list: defineQuery(listArgsSchema, ({ ctx, args }) =>
    transactionsForUser(ctx?.userId ?? NO_MATCH_ID, args ?? {}),
  ),

  recurring: defineQuery(({ ctx }: { ctx: Context }) =>
    recurringForUser(ctx?.userId ?? NO_MATCH_ID),
  ),

  spending: defineQuery(
    z.object({
      accountType: z.enum(["credit", "depository", "all"]).default("all"),
      period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
    }),
    ({ ctx, args }) =>
      spendingTransactionsForUser(ctx?.userId ?? NO_MATCH_ID, args.period, args.accountType),
  ),
};
