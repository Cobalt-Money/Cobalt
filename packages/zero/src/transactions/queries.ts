import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import {
  NO_MATCH_ID,
  creditTransactionsForUser,
  recurringForUser,
  transactionsForUser,
} from "./lib.js";

const listArgsSchema = z
  .object({
    amount: z.enum(["all", "income", "expense"]).optional(),
    amountMax: z.number().nonnegative().optional(),
    amountMin: z.number().nonnegative().optional(),
    bank: z.array(z.string()).optional(),
    status: z.enum(["all", "pending", "posted"]).optional(),
  })
  .optional();

/** Transaction-related named queries (`queries.transactions.*`). Composed in root `queries.ts`. */
export const transactionsQueries = {
  activity: defineQuery(z.object({ transactionId: z.string() }), ({ ctx, args }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.transactionEdit.where("id", NO_MATCH_ID);
    }
    return zql.transactionEdit
      .where("transactionId", args.transactionId)
      .where("userId", userId)
      .orderBy("createdAt", "asc");
  }),

  creditSpending: defineQuery(
    z.object({
      period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
    }),
    ({ ctx, args }) => {
      const userId = ctx?.userId;
      if (!userId) {
        return zql.transaction.where("id", NO_MATCH_ID);
      }
      return creditTransactionsForUser(userId, args.period);
    },
  ),

  list: defineQuery(listArgsSchema, ({ ctx, args }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.transaction.where("id", NO_MATCH_ID);
    }
    return transactionsForUser(userId, args ?? {});
  }),

  recurring: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.recurring.where("id", NO_MATCH_ID);
    }
    return recurringForUser(userId);
  }),
};
