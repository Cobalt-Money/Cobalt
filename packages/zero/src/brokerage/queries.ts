import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const RECENT_ACTIVITY_LIMIT = 50;
const RECENT_ORDER_LIMIT = 50;

/**
 * Brokerage domain — `queries.brokerage.*`. Backed by the unified schema
 * (financialAccount with source='snaptrade', plus holding/orders/investmentActivity/snapshot).
 */
export const brokerageQueries = {
  /** Linked SnapTrade brokerage accounts with balance, holdings, and authorization metadata. */
  accounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialAccount.where("id", NO_MATCH_ID);
    }
    return zql.financialAccount
      .where("userId", userId)
      .where("source", "snaptrade")
      .related("balance")
      .related("holdings")
      .related("snaptradeAuthorization");
  }),

  /** Plaid investment transaction feed, newest first. */
  plaidActivities: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.investmentActivity.where("id", NO_MATCH_ID);
    }
    return zql.investmentActivity
      .where("userId", userId)
      .whereExists("account", (acc) => acc.where("source", "plaid"))
      .related("account")
      .related("security")
      .orderBy("date", "desc")
      .limit(RECENT_ACTIVITY_LIMIT);
  }),

  /** Plaid investment-type accounts. */
  plaidInvestmentAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialAccount.where("id", NO_MATCH_ID);
    }
    return zql.financialAccount
      .where("userId", userId)
      .where("source", "plaid")
      .where("type", "investment")
      .related("plaidConnection", (q) => q.related("institution"))
      .related("balance");
  }),

  /** Plaid investment holdings across all linked Plaid investment accounts. */
  plaidPositions: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.holding.where("id", NO_MATCH_ID);
    }
    return zql.holding
      .where("userId", userId)
      .whereExists("account", (acc) => acc.where("source", "plaid"))
      .related("account")
      .related("security");
  }),

  /**
   * Historical SnapTrade portfolio snapshots for the signed-in user.
   * One row per brokerage account per day; aggregate for the net-worth chart.
   */
  portfolioSnapshots: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.snapshot.where("id", NO_MATCH_ID);
    }
    return zql.snapshot
      .where("userId", userId)
      .whereExists("account", (acc) => acc.where("source", "snaptrade"))
      .orderBy("snapshotDate", "desc")
      .limit(1000);
  }),

  /** Flat SnapTrade holdings list across accounts (sorted by symbol). */
  positions: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.holding.where("id", NO_MATCH_ID);
    }
    return zql.holding
      .where("userId", userId)
      .whereExists("account", (acc) => acc.where("source", "snaptrade"))
      .related("account")
      .related("security");
  }),

  /** Cross-account SnapTrade activity feed, newest trade date first. */
  recentActivities: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.investmentActivity.where("id", NO_MATCH_ID);
    }
    return zql.investmentActivity
      .where("userId", userId)
      .whereExists("account", (acc) => acc.where("source", "snaptrade"))
      .related("account")
      .related("security")
      .orderBy("date", "desc")
      .limit(RECENT_ACTIVITY_LIMIT);
  }),

  /** Recent SnapTrade orders across linked accounts, newest placement time first. */
  recentOrders: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.orders.where("id", NO_MATCH_ID);
    }
    return zql.orders
      .where("userId", userId)
      .related("account")
      .related("security")
      .orderBy("timePlaced", "desc")
      .limit(RECENT_ORDER_LIMIT);
  }),
};
