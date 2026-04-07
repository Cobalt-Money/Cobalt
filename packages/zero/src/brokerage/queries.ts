import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const RECENT_ACTIVITY_LIMIT = 50;
const RECENT_ORDER_LIMIT = 50;

/**
 * Brokerage domain — `queries.brokerage.*` (SnapTrade-synced `brokerage_*` tables).
 * Shapes align with `@cobalt-web/server-data/brokerage/merged` payloads (accounts, positions, activities, orders).
 */
export const brokerageQueries = {
  /** Linked brokerage accounts with balances, positions, per-account details, and institution metadata. */
  accounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.brokerageAccounts.where("id", NO_MATCH_ID);
    }
    return zql.brokerageAccounts
      .where("userId", userId)
      .related("balances")
      .related("positions")
      .related("accountDetails")
      .related("brokerageAuthorization");
  }),

  /** Flat holdings list across accounts (convenience for tables sorted by symbol). */
  positions: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.brokeragePositions.where("id", NO_MATCH_ID);
    }
    return zql.brokeragePositions
      .where("userId", userId)
      .related("brokerageAccount")
      .orderBy("symbol", "asc");
  }),

  /** Cross-account activity feed, newest trade date first. */
  recentActivities: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.brokerageActivities.where("id", NO_MATCH_ID);
    }
    return zql.brokerageActivities
      .where("userId", userId)
      .related("brokerageAccount")
      .orderBy("tradeDate", "desc")
      .limit(RECENT_ACTIVITY_LIMIT);
  }),

  /** Recent orders across linked accounts, newest placement time first. */
  recentOrders: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.brokerageOrders.where("id", NO_MATCH_ID);
    }
    return zql.brokerageOrders
      .where("userId", userId)
      .related("brokerageAccount")
      .orderBy("timePlaced", "desc")
      .limit(RECENT_ORDER_LIMIT);
  }),
};
