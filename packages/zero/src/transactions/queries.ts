import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import {
  NO_MATCH_ID,
  allTransactionsForUser,
  creditTransactionsForUser,
  recurringForUser,
  transactionsForUser,
} from "./lib.js";

/** Transaction-related named queries (`queries.transactions.*`). Composed in root `queries.ts`. */
export const transactionsQueries = {
  /**
   * Full transaction history — preload-only. Warms the client cache so that
   * raw-ZQL typeahead (command palette) runs entirely locally with no server
   * roundtrips. See Zero docs on local-only queries + preloading.
   */
  all: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.transaction.where("id", NO_MATCH_ID);
    }
    return allTransactionsForUser(userId);
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
    }
  ),

  list: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.transaction.where("id", NO_MATCH_ID);
    }
    return transactionsForUser(userId);
  }),

  recurring: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.recurringStream.where("id", NO_MATCH_ID);
    }
    return recurringForUser(userId);
  }),
};
