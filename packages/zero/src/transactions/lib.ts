import { zql } from "../schema.js";

/** UUID that never matches real rows — used when there is no authenticated user. */
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export function periodStartIso(period: "1w" | "1m" | "3m" | "6m" | "1y" | "all"): string | null {
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

/** Postgres `date` replicated as epoch ms in Zero — align with server-side `getSpending`. */
export function isoDateToZeroDate(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getTime();
}

/** Default page size for the transactions list — caller may bump via `limit` to load more. */
export const TRANSACTION_LIST_DEFAULT_LIMIT = 500;
/** Hard ceiling on a single subscription's row count to bound client sync payload. */
export const TRANSACTION_LIST_MAX_LIMIT = 10_000;

export interface TransactionListFilters {
  amount?: "all" | "income" | "expense";
  /** Inclusive lower bound on |amount|. Undefined = unbounded. */
  amountMin?: number;
  /** Inclusive upper bound on |amount|. Undefined = unbounded. */
  amountMax?: number;
  status?: "all" | "pending" | "posted";
  /** Institution IDs to include. Empty / undefined = all institutions. */
  bank?: readonly string[];
  /** Tag IDs to include (OR semantics). Empty / undefined = all. */
  tagIds?: readonly string[];
  /** Category IDs to include (OR semantics). Empty / undefined = all. */
  categoryIds?: readonly string[];
  /** Row cap. Defaults to {@link TRANSACTION_LIST_DEFAULT_LIMIT}, clamped to {@link TRANSACTION_LIST_MAX_LIMIT}. */
  limit?: number;
}

function applyAmountFilter<Q extends ReturnType<typeof zql.transaction.where>>(
  q: Q,
  amount: "all" | "income" | "expense",
  amountMin: number | undefined,
  amountMax: number | undefined,
) {
  const hasMin = typeof amountMin === "number" && amountMin > 0;
  const hasMax = typeof amountMax === "number";
  if (amount === "expense") {
    let next = hasMin ? q.where("amount", ">=", amountMin) : q.where("amount", ">", 0);
    if (hasMax) {
      next = next.where("amount", "<=", amountMax);
    }
    return next as Q;
  }
  if (amount === "income") {
    let next = hasMin ? q.where("amount", "<=", -amountMin) : q.where("amount", "<", 0);
    if (hasMax) {
      next = next.where("amount", ">=", -amountMax);
    }
    return next as Q;
  }
  if (!(hasMin || hasMax)) {
    return q;
  }
  const min = hasMin ? amountMin : 0;
  return q.where(({ cmp, or, and }) =>
    or(
      and(cmp("amount", ">=", min), ...(hasMax ? [cmp("amount", "<=", amountMax)] : [])),
      and(cmp("amount", "<=", -min), ...(hasMax ? [cmp("amount", ">=", -amountMax)] : [])),
    ),
  ) as Q;
}

export function transactionsForUser(userId: string, filters: TransactionListFilters = {}) {
  const {
    amount = "all",
    amountMin,
    amountMax,
    status = "all",
    bank,
    tagIds,
    categoryIds,
    limit,
  } = filters;
  const effectiveLimit = Math.min(
    typeof limit === "number" && limit > 0 ? Math.floor(limit) : TRANSACTION_LIST_DEFAULT_LIMIT,
    TRANSACTION_LIST_MAX_LIMIT,
  );
  const bankIds = bank && bank.length > 0 ? bank : null;
  const tagIdList = tagIds && tagIds.length > 0 ? tagIds : null;
  const categoryIdList = categoryIds && categoryIds.length > 0 ? categoryIds : null;

  let q = zql.transaction
    .where("userId", userId)
    .related("account", (q2) =>
      q2.related("plaidConnection", (conn) => conn.related("institution")),
    )
    .related("category", (c) => c.related("group"))
    .related("transactionTags");

  if (bankIds) {
    q = q.whereExists("account", (acc) =>
      acc.whereExists("plaidConnection", (conn) => conn.where("institutionId", "IN", bankIds)),
    );
  }

  if (tagIdList) {
    q = q.whereExists("transactionTags", (tt) => tt.where("tagId", "IN", tagIdList));
  }

  if (categoryIdList) {
    q = q.where("categoryId", "IN", categoryIdList);
  }

  // Plaid convention: positive amount = outflow (expense), negative = inflow (income).
  q = applyAmountFilter(q, amount, amountMin, amountMax);

  if (status === "pending") {
    q = q.where("pending", true);
  } else if (status === "posted") {
    q = q.where("pending", false);
  }

  return q.orderBy("date", "desc").limit(effectiveLimit);
}

export function recurringForUser(userId: string) {
  return zql.recurring
    .where("userId", userId)
    .where("isActive", true)
    .related("category", (c) => c.related("group"))
    .orderBy("lastDate", "desc");
}

export function spendingTransactionsForUser(
  userId: string,
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all",
  accountType: "credit" | "depository" | "all",
) {
  const start = periodStartIso(period);
  let q = zql.transaction
    .where("userId", userId)
    .where("excluded", false)
    .where("amount", ">", 0)
    .whereExists("account", (acc) =>
      accountType === "all"
        ? acc.where(({ cmp, or }) => or(cmp("type", "credit"), cmp("type", "depository")))
        : acc.where("type", accountType),
    )
    .related("category", (c) => c.related("group"));
  if (start) {
    q = q.where("date", ">=", isoDateToZeroDate(start));
  }
  return q.orderBy("date", "desc").limit(500);
}
