import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const BANK_SNAPSHOT_LIMIT = 3000;

/** Accounts domain — `queries.accounts.*` (bank + brokerage lists). */
export const accountsQueries = {
  /**
   * Historical bank balance snapshots for the signed-in user's accounts.
   * Includes the joined `account` row so callers can read `type` (depository vs credit).
   * Ordered oldest-first so callers can iterate in chronological order.
   */
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

  bankBalanceSnapshots: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.bankBalanceSnapshot.where("id", NO_MATCH_ID);
    }
    return zql.bankBalanceSnapshot
      .whereExists("account", (acc) =>
        acc.whereExists("connection", (conn) => conn.where("userId", userId))
      )
      .related("account", (q) =>
        q.related("connection", (c) => c.related("institution"))
      )
      .orderBy("snapshotDate", "asc")
      .limit(BANK_SNAPSHOT_LIMIT);
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
