import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const BANK_SNAPSHOT_LIMIT = 3000;
const PLAID_BANK_TYPES = ["depository", "credit", "loan"] as const;
const BANK_ACCOUNT_SOURCES = ["plaid", "manual"] as const;

const SNAPSHOT_RANGE = z.enum(["1W", "1M", "1Y", "All"]);
const RANGE_DAYS: Record<"1W" | "1M" | "1Y", number> = {
  "1M": 30,
  "1W": 7,
  "1Y": 365,
};

function snapshotCutoff(range: z.infer<typeof SNAPSHOT_RANGE> | undefined): number | null {
  if (!range || range === "All") {
    return null;
  }
  return Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
}

/** Accounts domain — `queries.accounts.*` (bank + brokerage lists). */
export const accountsQueries = {
  /** Bank-style accounts (Plaid + manual) for the signed-in user. */
  bankAccounts: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialAccount.where("id", NO_MATCH_ID);
    }
    return zql.financialAccount
      .where("userId", userId)
      .where("source", "IN", BANK_ACCOUNT_SOURCES)
      .where("type", "IN", PLAID_BANK_TYPES)
      .related("plaidConnection", (q) => q.related("institution"))
      .related("balance");
  }),

  /**
   * Historical balance snapshots for the user's Plaid bank-style accounts.
   *
   * No `.related()` joins — account/connection/institution metadata comes
   * from the existing `bankAccounts` subscription, joined client-side by
   * accountId. Keeping this a 0-relate query collapses the IVM pipeline to
   * a single stage and matches the portfolio query's hydrate profile.
   */
  bankBalanceSnapshots: defineQuery(
    z.object({ range: SNAPSHOT_RANGE.optional() }).optional(),
    ({ ctx, args }) => {
      const userId = ctx?.userId;
      if (!userId) {
        return zql.snapshot.where("id", NO_MATCH_ID);
      }
      const cutoff = snapshotCutoff(args?.range);
      const base = zql.snapshot
        .where("userId", userId)
        .whereExists("account", (acc) =>
          acc.where("source", "plaid").where("type", "IN", PLAID_BANK_TYPES),
        );
      const filtered = cutoff === null ? base : base.where("snapshotDate", ">=", cutoff);
      return filtered.orderBy("snapshotDate", "desc").limit(BANK_SNAPSHOT_LIMIT);
    },
  ),

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
