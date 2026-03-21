import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "./auth.js";
import { zql } from "./schema.js";

/** UUID that never matches real rows — used when there is no authenticated user. */
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

function periodStartIso(
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all"
): string | null {
  if (period === "all") {
    return null;
  }
  const now = new Date();
  const periodOffsets: Record<string, () => Date> = {
    "1m": () => new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    "1w": () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    "1y": () => new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    "3m": () => new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    "6m": () => new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
  };
  return periodOffsets[period]?.()?.toISOString().split("T")[0] ?? null;
}

/** Postgres `date` replicated as epoch ms in Zero — align with server-side `getCreditSpending`. */
function isoDateToZeroDate(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

function transactionsForUser(userId: string) {
  return zql.transaction
    .whereExists("account", (acc) =>
      acc.whereExists("connection", (conn) => conn.where("userId", userId))
    )
    .orderBy("date", "desc")
    .limit(100);
}

function recurringForUser(userId: string) {
  return zql.recurringStream
    .whereExists("account", (acc) =>
      acc.whereExists("connection", (conn) => conn.where("userId", userId))
    )
    .where("isActive", true)
    .orderBy("lastDate", "desc");
}

function creditTransactionsForUser(
  userId: string,
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all"
) {
  const start = periodStartIso(period);
  let q = zql.transaction.whereExists("account", (acc) =>
    acc
      .where("type", "credit")
      .whereExists("connection", (conn) => conn.where("userId", userId))
  );
  if (start) {
    q = q.where("date", ">=", isoDateToZeroDate(start));
  }
  return q.orderBy("date", "desc").limit(500);
}

export const queries = defineQueries({
  transactions: {
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
  },
});
