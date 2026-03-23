import { db } from "@cobalt-web/db";
import type { z } from "zod";

import { toDateString } from "./lib.js";
import type { transactionListQuerySchema } from "./schemas.js";

/** Same shape as validated `GET /transactions` query — keep in sync with `transactionListQuerySchema`. */
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

type TransactionRelationalWhere = NonNullable<
  Parameters<typeof db.query.transaction.findMany>[0]
>["where"];

// ── Queries ─────────────────────────────────────────────────────────

export async function getUserTransactions(
  userId: string,
  params: TransactionListQuery
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

  const whereParts: TransactionRelationalWhere[] = [
    {
      account: {
        connection: {
          userId: { eq: userId },
        },
      },
    },
  ];

  if (accountType) {
    whereParts.push({ account: { type: { eq: accountType } } });
  }
  if (pendingFilter !== undefined) {
    whereParts.push({ pending: { eq: pendingFilter === "true" } });
  }
  if (startDate) {
    whereParts.push({ date: { gte: startDate } });
  }
  if (endDate) {
    whereParts.push({ date: { lte: endDate } });
  }
  if (minAmount !== undefined) {
    whereParts.push({ amount: { gte: minAmount } });
  }
  if (maxAmount !== undefined) {
    whereParts.push({ amount: { lte: maxAmount } });
  }
  if (primaryCategory) {
    whereParts.push({
      RAW: (t, { sql: sqlOp }) =>
        sqlOp`${t.personalFinanceCategory}->>'primary' = ${primaryCategory}`,
    });
  }
  if (searchPattern) {
    whereParts.push({
      RAW: (t, { sql: sqlOp }) =>
        sqlOp`(${t.name} ILIKE ${searchPattern} OR ${t.merchantName} ILIKE ${searchPattern})`,
    });
  }

  const rows = await db.query.transaction.findMany({
    limit: pageSize,
    offset: page * pageSize,
    orderBy: { date: "desc" },
    // Mixed column + RAW filters widen past Drizzle's AND tuple inference (see TS2719).
    where: { AND: whereParts } as TransactionRelationalWhere,
    with: {
      account: {
        with: {
          connection: {
            with: {
              institution: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const { account } = row;
    const { connection } = account;
    const inst = connection.institution;

    const normalizedDate = toDateString(row.date) ?? "";
    const normalizedOverrideDate = toDateString(row.userOverrideDate);
    return {
      accountName: account.name,
      accountType: account.type,
      amount: row.amount,
      authorizedDate: toDateString(row.authorizedDate),
      date: normalizedOverrideDate ?? normalizedDate,
      id: row.id,
      institutionLogo: inst?.logo ?? null,
      institutionName: inst?.name ?? null,
      institutionUrl: inst?.url ?? null,
      location: row.location,
      logoUrl: row.logoUrl,
      merchantName: row.merchantName,
      name: row.name,
      pending: row.pending,
      personalFinanceCategory:
        row.userOverrideCategory ?? row.personalFinanceCategory,
      plaidAccountId: account.plaidAccountId,
      userOverrideCategory: row.userOverrideCategory,
      userOverrideDate: normalizedOverrideDate,
      userOverrideName: row.userOverrideName,
    };
  });
}

export async function getRecurringStreams(userId: string) {
  const rows = await db.query.recurringStream.findMany({
    orderBy: { lastDate: "desc" },
    where: {
      account: {
        connection: {
          userId: { eq: userId },
        },
      },
      isActive: { eq: true },
    },
    with: {
      account: {
        with: {
          connection: {
            with: {
              institution: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const { account } = row;
    const { connection } = account;
    return {
      accountName: account.name,
      accountSubtype: account.subtype,
      accountType: account.type,
      averageAmount: row.averageAmount,
      description: row.description,
      firstDate: row.firstDate,
      frequency: row.frequency,
      id: row.id,
      institutionLogo: connection.institution?.logo ?? null,
      institutionName: connection.institution?.name ?? null,
      institutionUrl: connection.institution?.url ?? null,
      isActive: row.isActive,
      lastAmount: row.lastAmount,
      lastDate: row.lastDate,
      merchantName: row.merchantName,
      personalFinanceCategory: row.personalFinanceCategory,
      predictedNextDate: row.predictedNextDate,
      status: row.status,
      streamId: row.streamId,
      streamType: row.streamType as "inflow" | "outflow",
      transactionIds: row.transactionIds,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  });
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

  const whereParts: TransactionRelationalWhere[] = [
    {
      account: {
        connection: {
          userId: { eq: userId },
        },
        type: { eq: "credit" },
        ...(accountId ? { plaidAccountId: { eq: accountId } } : {}),
      },
    },
  ];
  if (startDate) {
    whereParts.push({ date: { gte: startDate } });
  }

  const rows = await db.query.transaction.findMany({
    columns: {
      amount: true,
      date: true,
    },
    orderBy: { date: "desc" },
    where: { AND: whereParts } as TransactionRelationalWhere,
  });

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
