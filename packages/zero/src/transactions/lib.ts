import { zql } from "../schema.js";

export { NO_MATCH_ID } from "../auth.js";

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
  } = filters;
  const bankIds = bank && bank.length > 0 ? bank : null;
  const tagIdList = tagIds && tagIds.length > 0 ? tagIds : null;
  const categoryIdList = categoryIds && categoryIds.length > 0 ? categoryIds : null;
  const hasMin = typeof amountMin === "number" && amountMin > 0;
  const hasMax = typeof amountMax === "number";

  return zql.transaction
    .where("userId", userId)
    .where(({ and, cmp, exists, or }) => {
      // Plaid convention: positive amount = outflow (expense), negative = inflow (income).
      const amountExpr = () => {
        if (amount === "expense") {
          return and(
            hasMin ? cmp("amount", ">=", amountMin) : cmp("amount", ">", 0),
            hasMax ? cmp("amount", "<=", amountMax) : undefined,
          );
        }
        if (amount === "income") {
          return and(
            hasMin ? cmp("amount", "<=", -amountMin) : cmp("amount", "<", 0),
            hasMax ? cmp("amount", ">=", -amountMax) : undefined,
          );
        }
        if (!(hasMin || hasMax)) {
          return;
        }
        const min = hasMin ? amountMin : 0;
        return or(
          and(cmp("amount", ">=", min), hasMax ? cmp("amount", "<=", amountMax) : undefined),
          and(cmp("amount", "<=", -min), hasMax ? cmp("amount", ">=", -amountMax) : undefined),
        );
      };
      const statusExpr = () => {
        if (status === "pending") {
          return cmp("pending", true);
        }
        if (status === "posted") {
          return cmp("pending", false);
        }
      };
      // Bank options are deduped by lower-cased institution name (see
      // `useBankOptions`). Filter ids look like `bank:<name>` — we match the
      // name against both `plaid_connection.institutionName` (Plaid accounts)
      // and `financial_account.institutionName` (manual / CSV-imported), so
      // selecting "American Express" catches transactions from either source.
      const bankNames = bankIds
        ?.filter((b) => b.startsWith("bank:"))
        .map((b) => b.slice("bank:".length));
      return and(
        bankNames && bankNames.length > 0
          ? exists("account", (acc) =>
              acc.where(({ or: orInner, cmp: cmpInner, exists: existsInner }) =>
                orInner(
                  existsInner("plaidConnection", (conn) =>
                    conn.where(({ cmp: cmpConn }) =>
                      // Zero doesn't expose lower() — pass both raw and
                      // already-lower-cased forms so common casings match.
                      cmpConn("institutionName", "IN", bankNames),
                    ),
                  ),
                  cmpInner("institutionName", "IN", bankNames),
                ),
              ),
            )
          : undefined,
        tagIdList
          ? exists("transactionTags", (tt) => tt.where("tagId", "IN", tagIdList))
          : undefined,
        categoryIdList ? cmp("categoryId", "IN", categoryIdList) : undefined,
        amountExpr(),
        statusExpr(),
      );
    })
    .related("account", (q2) =>
      q2.related("plaidConnection", (conn) => conn.related("institution")),
    )
    .related("category", (c) => c.related("group"))
    .related("transactionTags")
    .orderBy("date", "desc");
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
  return zql.transaction
    .where("userId", userId)
    .where("excluded", false)
    .where("amount", ">", 0)
    .whereExists("account", (acc) =>
      accountType === "all"
        ? acc.where(({ cmp, or }) => or(cmp("type", "credit"), cmp("type", "depository")))
        : acc.where("type", accountType),
    )
    .where(({ and, cmp }) => and(start ? cmp("date", ">=", isoDateToZeroDate(start)) : undefined))
    .related("category", (c) => c.related("group"))
    .orderBy("date", "desc")
    .limit(500);
}
