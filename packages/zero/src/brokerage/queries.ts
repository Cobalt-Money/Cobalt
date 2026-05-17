import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const RECENT_ACTIVITY_LIMIT = 50;
const PORTFOLIO_SNAPSHOT_LIMIT = 1000;

const SNAPSHOT_RANGE = z.enum(["1W", "1M", "1Y", "All"]);
const RANGE_DAYS: Record<"1W" | "1M" | "1Y", number> = { "1M": 30, "1W": 7, "1Y": 365 };

const SOURCE_FILTER = z
  .object({ source: z.enum(["plaid", "snaptrade", "all"]).optional() })
  .optional();

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
  accounts: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.financialAccount
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("source", "snaptrade")
      .related("balance")
      .related("holdings")
      .related("snaptradeAuthorization"),
  ),

  /** Manual investment-type accounts created by the user. */
  manualInvestmentAccounts: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.financialAccount
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("source", "manual")
      .where("type", "investment")
      .related("balance")
      .related("holdings"),
  ),

  /** Plaid investment-type accounts. */
  plaidInvestmentAccounts: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.financialAccount
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("source", "plaid")
      .where("type", "investment")
      .related("plaidConnection", (q) => q.related("institution"))
      .related("balance"),
  ),

  /**
   * Historical SnapTrade portfolio snapshots for the signed-in user.
   * One row per brokerage account per day; aggregate for the net-worth chart.
   */
  portfolioSnapshots: defineQuery(
    z.object({ range: SNAPSHOT_RANGE.optional() }).optional(),
    ({ ctx, args }) => {
      const cutoff = snapshotCutoff(args?.range);
      return zql.snapshot
        .where("userId", ctx?.userId ?? NO_MATCH_ID)
        .whereExists("account", (acc) =>
          acc.where(({ or, cmp, and }) =>
            or(
              cmp("source", "snaptrade"),
              and(cmp("source", "plaid"), cmp("type", "investment")),
              and(cmp("source", "manual"), cmp("type", "investment")),
            ),
          ),
        )
        .where(({ and, cmp }) =>
          and(cutoff === null ? undefined : cmp("snapshotDate", ">=", cutoff)),
        )
        .orderBy("snapshotDate", "desc")
        .limit(PORTFOLIO_SNAPSHOT_LIMIT);
    },
  ),

  /** Holdings across linked investment accounts. `source` filters Plaid vs SnapTrade (default: all). */
  positions: defineQuery(
    SOURCE_FILTER,
    ({ args, ctx }: { args: z.infer<typeof SOURCE_FILTER>; ctx: Context }) => {
      const src = args?.source;
      return zql.holding
        .where("userId", ctx?.userId ?? NO_MATCH_ID)
        .where(({ and, exists }) =>
          and(
            src && src !== "all" ? exists("account", (acc) => acc.where("source", src)) : undefined,
          ),
        )
        .related("account")
        .related("security");
    },
  ),

  /** Investment activity feed across linked accounts. `source` filters Plaid vs SnapTrade. */
  recentActivities: defineQuery(
    SOURCE_FILTER,
    ({ args, ctx }: { args: z.infer<typeof SOURCE_FILTER>; ctx: Context }) => {
      const src = args?.source;
      return zql.investmentActivity
        .where("userId", ctx?.userId ?? NO_MATCH_ID)
        .where(({ and, exists }) =>
          and(
            src && src !== "all" ? exists("account", (acc) => acc.where("source", src)) : undefined,
          ),
        )
        .related("account")
        .related("security")
        .orderBy("date", "desc")
        .limit(RECENT_ACTIVITY_LIMIT);
    },
  ),
};
