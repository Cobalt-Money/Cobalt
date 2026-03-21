import { db } from "@cobalt-web/db";
import {
  transaction,
  bankAccount,
  bankConnection,
  institution,
  recurringStream,
} from "@cobalt-web/db/schema/banking";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

// ── Helpers ─────────────────────────────────────────────────────────

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

// ── Queries ─────────────────────────────────────────────────────────

export async function getUserTransactions(
  userId: string,
  params: {
    page?: number;
    pageSize?: number;
    accountType?: string;
    pendingFilter?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    searchQuery?: string;
    primaryCategory?: string;
  } = {}
) {
  const {
    page = 0,
    pageSize = 50,
    accountType,
    pendingFilter,
    startDate,
    endDate,
    searchQuery,
    minAmount,
    maxAmount,
    primaryCategory,
  } = params;

  const search = searchQuery?.trim();
  const searchPattern = search ? `%${search}%` : undefined;

  const rows = await db
    .select({
      accountName: bankAccount.name,
      accountType: bankAccount.type,
      amount: transaction.amount,
      authorizedDate: transaction.authorizedDate,
      date: transaction.date,
      id: transaction.id,
      institutionLogo: institution.logo,
      institutionName: institution.name,
      institutionUrl: institution.url,
      location: transaction.location,
      logoUrl: transaction.logoUrl,
      merchantName: transaction.merchantName,
      name: transaction.name,
      pending: transaction.pending,
      personalFinanceCategory: transaction.personalFinanceCategory,
      plaidAccountId: bankAccount.plaidAccountId,
      userOverrideCategory: transaction.userOverrideCategory,
      userOverrideDate: transaction.userOverrideDate,
      userOverrideName: transaction.userOverrideName,
    })
    .from(bankConnection)
    .innerJoin(
      bankAccount,
      eq(bankAccount.plaidItemId, bankConnection.plaidItemId)
    )
    .innerJoin(
      transaction,
      eq(transaction.plaidAccountId, bankAccount.plaidAccountId)
    )
    .leftJoin(
      institution,
      eq(bankConnection.institutionId, institution.plaidInstitutionId)
    )
    .where(
      and(
        eq(bankConnection.userId, userId),
        accountType ? eq(bankAccount.type, accountType) : undefined,
        pendingFilter === undefined
          ? undefined
          : eq(transaction.pending, pendingFilter === "true"),
        startDate ? gte(transaction.date, startDate) : undefined,
        endDate ? lte(transaction.date, endDate) : undefined,
        minAmount === undefined
          ? undefined
          : gte(transaction.amount, minAmount),
        maxAmount === undefined
          ? undefined
          : lte(transaction.amount, maxAmount),
        primaryCategory
          ? sql`${transaction.personalFinanceCategory}->>'primary' = ${primaryCategory}`
          : undefined,
        searchPattern
          ? sql`(${transaction.name} ILIKE ${searchPattern} OR ${transaction.merchantName} ILIKE ${searchPattern})`
          : undefined
      )
    )
    .orderBy(desc(transaction.date))
    .limit(pageSize)
    .offset(page * pageSize);

  type CategoryData = {
    primary: string;
    detailed: string;
    confidence_level?: string;
  } | null;

  return rows.map((row) => {
    const normalizedDate = toDateString(row.date) ?? "";
    const normalizedOverrideDate = toDateString(row.userOverrideDate);
    return {
      accountName: row.accountName,
      accountType: row.accountType,
      amount: row.amount,
      authorizedDate: toDateString(row.authorizedDate),
      date: normalizedOverrideDate ?? normalizedDate,
      id: row.id,
      institutionLogo: row.institutionLogo,
      institutionName: row.institutionName,
      institutionUrl: row.institutionUrl,
      location: row.location,
      logoUrl: row.logoUrl,
      merchantName: row.merchantName,
      name: row.userOverrideName ?? row.name,
      originalDate: normalizedDate,
      originalName: row.name,
      pending: row.pending,
      personalFinanceCategory:
        (row.userOverrideCategory as CategoryData) ??
        (row.personalFinanceCategory as CategoryData),
      plaidAccountId: row.plaidAccountId,
      userOverrideCategory: row.userOverrideCategory as CategoryData,
      userOverrideDate: normalizedOverrideDate,
      userOverrideName: row.userOverrideName,
    };
  });
}

export async function getRecurringStreams(userId: string) {
  const rows = await db
    .select({
      accountName: bankAccount.name,
      accountSubtype: bankAccount.subtype,
      accountType: bankAccount.type,
      averageAmount: recurringStream.averageAmount,
      description: recurringStream.description,
      firstDate: recurringStream.firstDate,
      frequency: recurringStream.frequency,
      id: recurringStream.id,
      institutionLogo: institution.logo,
      institutionName: institution.name,
      institutionUrl: institution.url,
      isActive: recurringStream.isActive,
      lastAmount: recurringStream.lastAmount,
      lastDate: recurringStream.lastDate,
      merchantName: recurringStream.merchantName,
      personalFinanceCategory: recurringStream.personalFinanceCategory,
      predictedNextDate: recurringStream.predictedNextDate,
      status: recurringStream.status,
      streamId: recurringStream.streamId,
      streamType: recurringStream.streamType,
      transactionIds: recurringStream.transactionIds,
      updatedAt: recurringStream.updatedAt,
    })
    .from(bankConnection)
    .innerJoin(
      bankAccount,
      eq(bankAccount.plaidItemId, bankConnection.plaidItemId)
    )
    .innerJoin(
      recurringStream,
      eq(recurringStream.plaidAccountId, bankAccount.plaidAccountId)
    )
    .leftJoin(
      institution,
      eq(bankConnection.institutionId, institution.plaidInstitutionId)
    )
    .where(
      and(eq(bankConnection.userId, userId), eq(recurringStream.isActive, true))
    )
    .orderBy(desc(recurringStream.lastDate));

  return rows.map((row) => ({
    ...row,
    streamType: row.streamType as "inflow" | "outflow",
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }));
}

export async function getCreditSpending(
  userId: string,
  period: "1w" | "1m" | "3m" | "6m" | "1y" | "all",
  accountId?: string
) {
  const now = new Date();
  const periodOffsets: Record<string, () => Date> = {
    "1m": () => new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    "1w": () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    "1y": () => new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    "3m": () => new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    "6m": () => new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
  };
  const startDate =
    periodOffsets[period]?.()?.toISOString().split("T")[0] ?? null;

  const rows = await db
    .select({ amount: transaction.amount, date: transaction.date })
    .from(bankConnection)
    .innerJoin(
      bankAccount,
      eq(bankAccount.plaidItemId, bankConnection.plaidItemId)
    )
    .innerJoin(
      transaction,
      eq(transaction.plaidAccountId, bankAccount.plaidAccountId)
    )
    .where(
      and(
        eq(bankConnection.userId, userId),
        eq(bankAccount.type, "credit"),
        startDate ? gte(transaction.date, startDate) : undefined,
        accountId ? eq(bankAccount.plaidAccountId, accountId) : undefined
      )
    )
    .orderBy(desc(transaction.date));

  const bucketSizeMap: Record<string, "daily" | "weekly" | "monthly"> = {
    "1m": "daily",
    "1w": "daily",
    "1y": "monthly",
    "3m": "weekly",
    "6m": "monthly",
    all: "monthly",
  };
  const averageLabelMap: Record<
    string,
    "daily" | "weekly" | "monthly" | "yearly"
  > = {
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
    buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(row.amount));
  }

  const spending = [...buckets.entries()]
    .map(([date, amount]) => ({ amount, date }))
    .toSorted((a, b) => a.date.localeCompare(b.date));
  const totalSpending = spending.reduce(
    (sum: number, row: { amount: number; date: string }) => sum + row.amount,
    0
  );
  const averageSpending =
    spending.length > 0 ? totalSpending / spending.length : 0;

  return { averageLabel, averageSpending, spending, totalSpending };
}

// ── Mutations ───────────────────────────────────────────────────────

export async function updateTransactionOverride(
  transactionId: string,
  field: "userOverrideCategory" | "userOverrideDate" | "userOverrideName",
  value: unknown
) {
  await db
    .update(transaction)
    .set({ [field]: value })
    .where(eq(transaction.id, transactionId));
}
