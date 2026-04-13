import { zql } from "../schema.js";

/** UUID that never matches real rows — used when there is no authenticated user. */
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export function periodStartIso(
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
export function isoDateToZeroDate(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

export function transactionsForUser(userId: string) {
  return zql.transaction
    .whereExists("account", (acc) =>
      acc.whereExists("connection", (conn) => conn.where("userId", userId))
    )
    .related("account", (q) =>
      q.related("connection", (conn) => conn.related("institution"))
    )
    .orderBy("date", "desc")
    .limit(100);
}

/**
 * All transactions for a user — used as a preload so the full history syncs
 * into the client local store. Client-side typeahead (e.g. command palette)
 * then runs **raw ZQL** against the warm cache with zero server roundtrips.
 *
 * See Zero docs on local-only ZQL + `zero.preload()`:
 * https://zero.rocicorp.dev/docs/queries#local-only-queries
 */
export function allTransactionsForUser(userId: string) {
  return zql.transaction
    .whereExists("account", (acc) =>
      acc.whereExists("connection", (conn) => conn.where("userId", userId))
    )
    .related("account", (q) =>
      q.related("connection", (conn) => conn.related("institution"))
    )
    .orderBy("date", "desc");
}

export function recurringForUser(userId: string) {
  return zql.recurringStream
    .whereExists("account", (acc) =>
      acc.whereExists("connection", (conn) => conn.where("userId", userId))
    )
    .where("isActive", true)
    .orderBy("lastDate", "desc");
}

export function creditTransactionsForUser(
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
