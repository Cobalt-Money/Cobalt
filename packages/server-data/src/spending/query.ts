import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { db } from "@cobalt-web/db";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const toDateString = (val: string | Date | null | undefined): string | null => {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0] ?? null;
  }
  if (typeof val === "string" && val.includes("T")) {
    return val.split("T")[0] ?? null;
  }
  return val;
};

export async function getSpending(
  userId: string,
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all",
  accountType: "credit" | "depository" | "all",
  accountId?: string,
) {
  const now = new Date();
  const periodOffsets: Record<string, () => Date> = {
    "1m": () => new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    "1w": () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    "1y": () => new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    "3m": () => new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    "6m": () => new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
  };
  const startDate = periodOffsets[period]?.()?.toISOString().split("T")[0] ?? null;

  const conditions: SQL[] = [
    eq(transaction.userId, userId),
    eq(transaction.excluded, false),
    or(eq(category.excludeFromInsights, false), sql`${category.id} IS NULL`) as SQL,
    gte(transaction.amount, "0"),
  ];
  if (accountType === "credit") {
    conditions.push(eq(financialAccount.type, "credit"));
  } else if (accountType === "depository") {
    conditions.push(eq(financialAccount.type, "depository"));
  } else {
    conditions.push(inArray(financialAccount.type, ["credit", "depository"]));
  }
  if (accountId) {
    conditions.push(eq(financialAccount.externalId, accountId));
  }
  if (startDate) {
    conditions.push(gte(transaction.date, startDate));
  }

  const rows = await db
    .select({
      amount: transaction.amount,
      date: transaction.date,
    })
    .from(transaction)
    .innerJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(and(...conditions))
    .orderBy(desc(transaction.date));

  const bucketSizeMap: Record<string, "daily" | "weekly" | "monthly"> = {
    "1m": "daily",
    "1w": "daily",
    "1y": "monthly",
    "3m": "weekly",
    "6m": "monthly",
    all: "monthly",
  };
  const averageLabelMap: Record<string, "daily" | "weekly" | "monthly" | "yearly"> = {
    "1m": "daily",
    "1w": "daily",
    "1y": "monthly",
    "3m": "weekly",
    "6m": "monthly",
    all: "yearly",
  };
  const bucketSize = bucketSizeMap[period] ?? "monthly";
  const averageLabel = averageLabelMap[period] ?? "monthly";

  const buckets = new Map<string, number>();
  for (const row of rows) {
    const d = toDateString(row.date) ?? "";
    let key: string;
    if (bucketSize === "daily") {
      key = d;
    } else if (bucketSize === "weekly") {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - dt.getDay());
      key = dt.toISOString().split("T")[0] ?? d;
    } else {
      key = d.slice(0, 7);
    }
    buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
  }

  const spending = [...buckets.entries()]
    .map(([date, amount]) => ({ amount, date }))
    .toSorted((a, b) => a.date.localeCompare(b.date));
  const totalSpending = spending.reduce(
    (sum: number, row: { amount: number; date: string }) => sum + row.amount,
    0,
  );
  const averageSpending = spending.length > 0 ? totalSpending / spending.length : 0;

  return { averageLabel, averageSpending, spending, totalSpending };
}
