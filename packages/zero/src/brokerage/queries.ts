import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const RECENT_ACTIVITY_LIMIT = 50;
const RECENT_ORDER_LIMIT = 50;
const PORTFOLIO_SNAPSHOT_LIMIT = 1000;

const SNAPSHOT_RANGE = z.enum(["1W", "1M", "1Y", "All"]);
const RANGE_DAYS: Record<"1W" | "1M" | "1Y", number> = { "1M": 30, "1W": 7, "1Y": 365 };

function snapshotCutoff(range: z.infer<typeof SNAPSHOT_RANGE> | undefined): number | null {
  if (!range || range === "All") {
    return null;
  }
  return Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
}

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
  portfolioSnapshots: defineQuery(
    z.object({ range: SNAPSHOT_RANGE.optional() }).optional(),
    ({ ctx, args }) => {
      const userId = ctx?.userId;
      if (!userId) {
        return zql.snapshot.where("id", NO_MATCH_ID);
      }
      const cutoff = snapshotCutoff(args?.range);
      const base = zql.snapshot
        .where("userId", userId)
        .whereExists("account", (acc) => acc.where("source", "snaptrade"));
      const filtered = cutoff === null ? base : base.where("snapshotDate", ">=", cutoff);
      return filtered.orderBy("snapshotDate", "desc").limit(PORTFOLIO_SNAPSHOT_LIMIT);
    },
  ),

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
