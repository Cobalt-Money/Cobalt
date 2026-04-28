import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const BANK_SNAPSHOT_LIMIT = 3000;
const PLAID_ACCOUNT_TYPES = [
  "depository",
  "credit",
  "loan",
  "investment",
] as const;

/** Accounts domain — `queries.accounts.*` (bank + brokerage lists). */
export const accountsQueries = {
  /** Plaid accounts (depository / credit / loan / investment) for the signed-in user. */
  bankAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialAccount.where("id", NO_MATCH_ID);
    }
    return zql.financialAccount
      .where("userId", userId)
      .where("source", "plaid")
      .where("type", "IN", PLAID_ACCOUNT_TYPES)
      .related("plaidConnection", (q) => q.related("institution"))
      .related("balance");
  }),

  /** Historical balance snapshots for the user's Plaid bank-style accounts. */
  bankBalanceSnapshots: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.snapshot.where("id", NO_MATCH_ID);
    }
    return zql.snapshot
      .where("userId", userId)
      .whereExists("account", (acc) =>
        acc.where("source", "plaid").where("type", "IN", PLAID_ACCOUNT_TYPES)
      )
      .related("account", (q) =>
        q.related("plaidConnection", (c) => c.related("institution"))
      )
      .orderBy("snapshotDate", "desc")
      .limit(BANK_SNAPSHOT_LIMIT);
  }),

  /** SnapTrade-linked brokerage accounts. */
  brokerageAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialAccount.where("id", NO_MATCH_ID);
    }
    return zql.financialAccount
      .where("userId", userId)
      .where("source", "snaptrade")
      .related("balance")
      .related("snaptradeAuthorization");
  }),
};
