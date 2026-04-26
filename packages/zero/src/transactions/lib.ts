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

/** Row cap for the transactions list — bounded payload regardless of user volume. */
const TRANSACTION_LIST_LIMIT = 500;

export interface TransactionListFilters {
  amount?: "all" | "income" | "expense";
  /** Inclusive lower bound on |amount|. Undefined = unbounded. */
  amountMin?: number;
  /** Inclusive upper bound on |amount|. Undefined = unbounded. */
  amountMax?: number;
  status?: "all" | "pending" | "posted";
  /** Institution IDs to include. Empty / undefined = all institutions. */
  bank?: readonly string[];
}

export function transactionsForUser(
  userId: string,
  filters: TransactionListFilters = {}
) {
  const {
    amount = "all",
    amountMin,
    amountMax,
    status = "all",
    bank,
  } = filters;
  const bankIds = bank && bank.length > 0 ? bank : null;
  const hasMin = typeof amountMin === "number" && amountMin > 0;
  const hasMax = typeof amountMax === "number";

  let q = zql.transaction
    .where("userId", userId)
    .related("account", (q2) =>
      q2.related("plaidConnection", (conn) => conn.related("institution"))
    );

  if (bankIds) {
    q = q.whereExists("account", (acc) =>
      acc.whereExists("plaidConnection", (conn) =>
        conn.where("institutionId", "IN", bankIds)
      )
    );
  }

  // Plaid convention: positive amount = outflow (expense), negative = inflow (income).
  // Filter signed bounds per selected type; for "all" apply |amount| in [min,max]
  // as a two-branch OR (no abs() in ZQL).
  if (amount === "expense") {
    q = hasMin ? q.where("amount", ">=", amountMin) : q.where("amount", ">", 0);
    if (hasMax) {
      q = q.where("amount", "<=", amountMax);
    }
  } else if (amount === "income") {
    q = hasMin
      ? q.where("amount", "<=", -amountMin)
      : q.where("amount", "<", 0);
    if (hasMax) {
      q = q.where("amount", ">=", -amountMax);
    }
  } else if (hasMin || hasMax) {
    const min = hasMin ? amountMin : 0;
    q = q.where(({ cmp, or, and }) =>
      or(
        and(
          cmp("amount", ">=", min),
          ...(hasMax ? [cmp("amount", "<=", amountMax)] : [])
        ),
        and(
          cmp("amount", "<=", -min),
          ...(hasMax ? [cmp("amount", ">=", -amountMax)] : [])
        )
      )
    );
  }

  if (status === "pending") {
    q = q.where("pending", true);
  } else if (status === "posted") {
    q = q.where("pending", false);
  }

  return q.orderBy("date", "desc").limit(TRANSACTION_LIST_LIMIT);
}

export function recurringForUser(userId: string) {
  return zql.recurringStream
    .where("userId", userId)
    .where("isActive", true)
    .orderBy("lastDate", "desc");
}

export function creditTransactionsForUser(
  userId: string,
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all"
) {
  const start = periodStartIso(period);
  let q = zql.transaction
    .where("userId", userId)
    .whereExists("account", (acc) => acc.where("type", "credit"));
  if (start) {
    q = q.where("date", ">=", isoDateToZeroDate(start));
  }
  return q.orderBy("date", "desc").limit(500);
}
