import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { z } from "zod";

import { toDateString } from "./lib.js";
import type { transactionListQuerySchema } from "./schemas.js";
import { toTransactionListItem } from "./to-transaction-list-item.js";

export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

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

  const conditions: SQL[] = [eq(transaction.userId, userId)];
  if (accountType) {
    conditions.push(eq(financialAccount.type, accountType));
  }
  if (pendingFilter !== undefined) {
    conditions.push(eq(transaction.pending, pendingFilter === "true"));
  }
  if (startDate) {
    conditions.push(gte(transaction.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(transaction.date, endDate));
  }
  if (minAmount !== undefined) {
    conditions.push(gte(transaction.amount, String(minAmount)));
  }
  if (maxAmount !== undefined) {
    conditions.push(lte(transaction.amount, String(maxAmount)));
  }
  if (primaryCategory) {
    conditions.push(eq(transaction.category, primaryCategory));
  }
  if (searchPattern) {
    const orClause = or(
      ilike(transaction.name, searchPattern),
      ilike(transaction.merchantName, searchPattern),
      sql`${transaction.notes}::text ILIKE ${searchPattern}`
    );
    if (orClause) {
      conditions.push(orClause);
    }
  }

  const rows = await db
    .select({
      account: {
        externalId: financialAccount.externalId,
        name: financialAccount.name,
        type: financialAccount.type,
      },
      address: transaction.address,
      amount: transaction.amount,
      authorizedDate: transaction.authorizedDate,
      category: transaction.category,
      categoryConfidence: transaction.categoryConfidence,
      categoryDetail: transaction.categoryDetail,
      city: transaction.city,
      counterparties: transaction.counterparties,
      country: transaction.country,
      date: transaction.date,
      id: transaction.id,
      institution: {
        logo: institution.logo,
        name: institution.name,
        url: institution.url,
      },
      lat: transaction.lat,
      lockedFields: transaction.lockedFields,
      logoUrl: transaction.logoUrl,
      lon: transaction.lon,
      merchantName: transaction.merchantName,
      name: transaction.name,
      notes: transaction.notes,
      pending: transaction.pending,
      postalCode: transaction.postalCode,
      region: transaction.region,
      source: transaction.source,
      storeNumber: transaction.storeNumber,
      userOverrideLocation: transaction.userOverrideLocation,
      website: transaction.website,
    })
    .from(transaction)
    .innerJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .leftJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .leftJoin(
      institution,
      eq(institution.plaidInstitutionId, plaidConnection.institutionId)
    )
    .where(and(...conditions))
    .orderBy(desc(transaction.date))
    .limit(pageSize)
    .offset(page * pageSize);

  return rows.map((row) =>
    toTransactionListItem({
      account: {
        name: row.account.name,
        plaidAccountId: row.account.externalId,
        type: row.account.type,
      },
      institution: row.institution
        ? {
            logo: row.institution.logo ?? null,
            name: row.institution.name ?? null,
            url: row.institution.url ?? null,
          }
        : null,
      transaction: {
        address: row.address,
        amount: Number(row.amount),
        authorizedDate: row.authorizedDate,
        category: row.category,
        categoryConfidence: row.categoryConfidence,
        categoryDetail: row.categoryDetail,
        city: row.city,
        counterparties: row.counterparties,
        country: row.country,
        date: row.date,
        id: row.id,
        lat: row.lat,
        lockedFields: row.lockedFields,
        logoUrl: row.logoUrl,
        lon: row.lon,
        merchantName: row.merchantName,
        name: row.name,
        notes: row.notes ?? null,
        pending: row.pending,
        postalCode: row.postalCode,
        region: row.region,
        source: row.source,
        storeNumber: row.storeNumber,
        userOverrideLocation: row.userOverrideLocation,
        website: row.website,
      },
    })
  );
}

export async function getRecurringStreams(userId: string) {
  const rows = await db.query.recurring.findMany({
    orderBy: { lastDate: "desc" },
    where: {
      isActive: { eq: true },
      userId: { eq: userId },
    },
    with: {
      account: {
        columns: { name: true, subtype: true, type: true },
        with: {
          plaidConnection: {
            columns: {},
            with: {
              institution: {
                columns: { logo: true, name: true, url: true },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const inst = row.account.plaidConnection?.institution ?? null;
    return {
      accountName: row.account.name,
      accountSubtype: row.account.subtype,
      accountType: row.account.type,
      averageAmount: Number(row.averageAmount),
      category: row.category,
      categoryConfidence: row.categoryConfidence,
      categoryDetail: row.categoryDetail,
      description: row.description,
      firstDate: row.firstDate,
      frequency: row.frequency,
      id: row.id,
      institutionLogo: inst?.logo ?? null,
      institutionName: inst?.name ?? null,
      institutionUrl: inst?.url ?? null,
      isActive: row.isActive,
      lastAmount: Number(row.lastAmount),
      lastDate: row.lastDate,
      merchantName: row.merchantName,
      predictedNextDate: row.predictedNextDate,
      status: row.status,
      streamId: row.externalId,
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

  const conditions: SQL[] = [
    eq(transaction.userId, userId),
    eq(financialAccount.type, "credit"),
  ];
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
    buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(Number(row.amount)));
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

export async function getTransactionActivity(transactionId: string) {
  const rows = await db.query.transactionEdit.findMany({
    columns: {
      actor: true,
      createdAt: true,
      field: true,
      id: true,
      newValue: true,
      oldValue: true,
    },
    orderBy: { createdAt: "asc" },
    where: { transactionId: { eq: transactionId } },
  });

  return rows.map((r) => ({
    actor: r.actor,
    createdAt: r.createdAt.toISOString(),
    field: r.field,
    id: r.id,
    newValue: r.newValue,
    oldValue: r.oldValue,
  }));
}
