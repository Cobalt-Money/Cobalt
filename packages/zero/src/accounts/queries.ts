import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

/** Accounts domain — `queries.accounts.*` (bank + brokerage lists). */
export const accountsQueries = {
  bankAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.bankAccount.where("id", NO_MATCH_ID);
    }
    return zql.bankAccount
      .whereExists("connection", (conn) => conn.where("userId", userId))
      .related("connection", (q) => q.related("institution"))
      .related("balances");
  }),

  brokerageAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.brokerageAccounts.where("id", NO_MATCH_ID);
    }
    return zql.brokerageAccounts
      .where("userId", userId)
      .related("balances")
      .related("brokerageAuthorization");
  }),
};
