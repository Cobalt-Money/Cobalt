import { db } from "@cobalt-web/db";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Transaction, TransactionStream } from "plaid";

import { lookupCategoryIdsBySystemKey } from "../../../transactions/categories/lookup.js";
import { pfcDetailedToSystemKey } from "../../../transactions/categories/map.js";
import type { CategorySystemKey } from "../../../transactions/categories/system-keys.js";
import {
  lookupFinancialAccountsByPlaidIds,
  lookupPlaidConnection,
} from "../link/queries.js";
import { fetchRecurringStreams } from "./actions.js";
import { transactionToRecord } from "./lib.js";
import type { UserOverrides } from "./queries.js";

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

export async function setTransactionsCursor(
  plaidItemId: string,
  cursor: string | undefined
): Promise<void> {
  await db
    .update(plaidConnection)
    .set({ transactionsCursor: cursor, updatedAt: new Date() })
    .where(eq(plaidConnection.plaidItemId, plaidItemId));
}

/**
 * For a set of (userId, systemKey) pairs, batch-resolve to categoryId per user.
 * Always includes `uncategorized` in the per-user fetch so we have a fallback.
 * Returns: Map<userId, Map<systemKey, categoryId>>.
 */
async function resolveCategoryIdsForUsers(
  needs: Map<string, Set<CategorySystemKey>>
): Promise<Map<string, Map<CategorySystemKey, string>>> {
  const out = new Map<string, Map<CategorySystemKey, string>>();
  await Promise.all(
    [...needs.entries()].map(async ([userId, keys]) => {
      keys.add("uncategorized");
      const map = await lookupCategoryIdsBySystemKey(userId, [...keys]);
      out.set(userId, map);
    })
  );
  return out;
}

function pickCategoryId(
  resolved: Map<string, Map<CategorySystemKey, string>>,
  userId: string,
  systemKey: CategorySystemKey
): string | null {
  const userMap = resolved.get(userId);
  if (!userMap) {
    return null;
  }
  return userMap.get(systemKey) ?? userMap.get("uncategorized") ?? null;
}

export async function persistTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const plaidAccountIds = [...new Set(transactions.map((t) => t.account_id))];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const needs = new Map<string, Set<CategorySystemKey>>();
  for (const tx of transactions) {
    const ref = accountMap.get(tx.account_id);
    if (!ref) {
      continue;
    }
    const key = pfcDetailedToSystemKey(tx.personal_finance_category?.detailed);
    let set = needs.get(ref.userId);
    if (!set) {
      set = new Set();
      needs.set(ref.userId, set);
    }
    set.add(key);
  }
  const resolved = await resolveCategoryIdsForUsers(needs);

  const records = transactions
    .map((tx) => {
      const ref = accountMap.get(tx.account_id);
      if (!ref) {
        return null;
      }
      const systemKey = pfcDetailedToSystemKey(
        tx.personal_finance_category?.detailed
      );
      const categoryId = pickCategoryId(resolved, ref.userId, systemKey);
      if (!categoryId) {
        // User missing seed (signup hook failure); skip until backfill.
        return null;
      }
      return transactionToRecord(tx, ref.id, ref.userId, categoryId);
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (records.length === 0) {
    return;
  }

  await db
    .insert(transactionTable)
    .values(records)
    .onConflictDoUpdate({
      set: {
        accountId: sql`excluded.account_id`,
        accountOwner: sql`excluded.account_owner`,
        address: sql`excluded.address`,
        amount: sql`excluded.amount`,
        authorizedDate: sql`excluded.authorized_date`,
        // Respect lockedFields: only overwrite if user has not locked the field.
        categoryId: sql`CASE WHEN ${transactionTable.lockedFields} ? 'category' THEN ${transactionTable.categoryId} ELSE excluded.category_id END`,
        checkNumber: sql`excluded.check_number`,
        city: sql`excluded.city`,
        counterparties: sql`excluded.counterparties`,
        country: sql`excluded.country`,
        currency: sql`excluded.currency`,
        date: sql`CASE WHEN ${transactionTable.lockedFields} ? 'date' THEN ${transactionTable.date} ELSE excluded.date END`,
        lat: sql`excluded.lat`,
        logoUrl: sql`excluded.logo_url`,
        lon: sql`excluded.lon`,
        merchantEntityId: sql`excluded.merchant_entity_id`,
        merchantName: sql`excluded.merchant_name`,
        name: sql`CASE WHEN ${transactionTable.lockedFields} ? 'name' THEN ${transactionTable.name} ELSE excluded.name END`,
        paymentChannel: sql`excluded.payment_channel`,
        pending: sql`excluded.pending`,
        pendingTransactionId: sql`excluded.pending_transaction_id`,
        postalCode: sql`excluded.postal_code`,
        region: sql`excluded.region`,
        storeNumber: sql`excluded.store_number`,
        transactionCode: sql`excluded.transaction_code`,
        updatedAt: sql`now()`,
        website: sql`excluded.website`,
      },
      target: [transactionTable.source, transactionTable.externalId],
      targetWhere: externalIdNotNullWhere,
    });
}

export async function removeTransactionsByIds(
  transactionIds: string[]
): Promise<void> {
  if (transactionIds.length === 0) {
    return;
  }
  await db
    .delete(transactionTable)
    .where(
      and(
        eq(transactionTable.source, "plaid"),
        inArray(transactionTable.externalId, transactionIds)
      )
    );
}

export async function applyPendingOverrides(
  overrides: Map<string, UserOverrides>
): Promise<number> {
  if (overrides.size === 0) {
    return 0;
  }

  const pendingIds = [...overrides.keys()];

  const postedTxs = await db.query.transaction.findMany({
    columns: { externalId: true, pendingTransactionId: true },
    where: {
      pendingTransactionId: { in: pendingIds },
      source: { eq: "plaid" },
    },
  });

  let applied = 0;
  for (const posted of postedTxs) {
    const override = overrides.get(posted.pendingTransactionId ?? "");
    if (!override || posted.externalId === null) {
      continue;
    }

    await db
      .update(transactionTable)
      .set({
        categoryId: override.lockedFields.includes("category")
          ? (override.categoryId ?? undefined)
          : undefined,
        lockedFields: override.lockedFields,
        name: override.lockedFields.includes("name")
          ? override.name
          : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactionTable.source, "plaid"),
          eq(transactionTable.externalId, posted.externalId)
        )
      );

    applied += 1;
  }

  return applied;
}

const RECURRING_STREAM_BATCH_SIZE = 100;

type RecurringStreamRow = TransactionStream & { type: "inflow" | "outflow" };

function todayDateOnly(): string {
  return new Date().toISOString().split("T").at(0) ?? "";
}

function mapRecurringStreamBase(
  s: RecurringStreamRow,
  today: string,
  accountId: string,
  userId: string
) {
  const isActive =
    s.is_active && s.predicted_next_date && s.predicted_next_date < today
      ? false
      : (s.is_active ?? false);
  return {
    accountId,
    averageAmount: String(s.average_amount?.amount ?? 0),
    externalId: s.stream_id,
    firstDate: s.first_date,
    isActive,
    lastAmount: String(s.last_amount?.amount ?? 0),
    lastDate: s.last_date ?? s.first_date,
    source: "plaid" as const,
    streamType: s.type,
    userId,
  };
}

function mapRecurringStreamMeta(s: RecurringStreamRow) {
  return {
    description: s.description ?? "",
    frequency: s.frequency ?? "UNKNOWN",
    merchantName: s.merchant_name ?? null,
    predictedNextDate: s.predicted_next_date ?? null,
    status: s.status ?? "UNKNOWN",
    transactionIds: s.transaction_ids ?? [],
  };
}

async function upsertRecurringStreams(
  streams: RecurringStreamRow[]
): Promise<void> {
  const today = todayDateOnly();

  const plaidAccountIds = [...new Set(streams.map((s) => s.account_id))];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const needs = new Map<string, Set<CategorySystemKey>>();
  for (const s of streams) {
    const ref = accountMap.get(s.account_id);
    if (!ref) {
      continue;
    }
    const key = pfcDetailedToSystemKey(s.personal_finance_category?.detailed);
    let set = needs.get(ref.userId);
    if (!set) {
      set = new Set();
      needs.set(ref.userId, set);
    }
    set.add(key);
  }
  const resolved = await resolveCategoryIdsForUsers(needs);

  const rows = streams
    .map((s) => {
      const ref = accountMap.get(s.account_id);
      if (!ref) {
        return null;
      }
      const systemKey = pfcDetailedToSystemKey(
        s.personal_finance_category?.detailed
      );
      const categoryId = pickCategoryId(resolved, ref.userId, systemKey);
      if (!categoryId) {
        return null;
      }
      return {
        ...mapRecurringStreamBase(s, today, ref.id, ref.userId),
        ...mapRecurringStreamMeta(s),
        categoryId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += RECURRING_STREAM_BATCH_SIZE) {
    const batch = rows.slice(i, i + RECURRING_STREAM_BATCH_SIZE);
    await db
      .insert(recurring)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          averageAmount: sql`excluded.average_amount`,
          categoryId: sql`excluded.category_id`,
          description: sql`excluded.description`,
          frequency: sql`excluded.frequency`,
          isActive: sql`excluded.is_active`,
          lastAmount: sql`excluded.last_amount`,
          lastDate: sql`excluded.last_date`,
          merchantName: sql`excluded.merchant_name`,
          predictedNextDate: sql`excluded.predicted_next_date`,
          status: sql`excluded.status`,
          transactionIds: sql`excluded.transaction_ids`,
          updatedAt: new Date(),
        },
        target: [recurring.source, recurring.externalId],
        targetWhere: externalIdNotNullWhere,
      });
  }
}

export async function syncRecurringForItem(
  accessToken: string,
  plaidItemId: string
): Promise<{ added: number; modified: number; removed: number }> {
  const conn = await lookupPlaidConnection(plaidItemId);
  if (!conn) {
    throw new Error(`plaid_connection not found for item ${plaidItemId}`);
  }

  const accountIdsForItem = await db.query.financialAccount.findMany({
    columns: { id: true },
    where: {
      plaidConnectionId: { eq: conn.id },
      source: { eq: "plaid" },
    },
  });
  const accountIdSet = new Set(accountIdsForItem.map((a) => a.id));

  const existingStreams = await db.query.recurring.findMany({
    columns: { accountId: true, externalId: true },
    where: { source: { eq: "plaid" } },
  });

  const existingStreamIds = new Set(
    existingStreams
      .filter((s) => accountIdSet.has(s.accountId) && s.externalId !== null)
      .map((s) => s.externalId as string)
  );

  const { inflowStreams, outflowStreams, updatedDatetime } =
    await fetchRecurringStreams(accessToken);

  const allStreams: RecurringStreamRow[] = [
    ...inflowStreams.map((stream) => ({ ...stream, type: "inflow" as const })),
    ...outflowStreams.map((stream) => ({
      ...stream,
      type: "outflow" as const,
    })),
  ];

  const added = allStreams.filter(
    (s) => !existingStreamIds.has(s.stream_id)
  ).length;
  const modified = allStreams.filter((s) =>
    existingStreamIds.has(s.stream_id)
  ).length;

  await upsertRecurringStreams(allStreams);

  for (const stream of allStreams) {
    existingStreamIds.delete(stream.stream_id);
  }

  let removed = 0;
  if (existingStreamIds.size > 0) {
    const removedStreamIds = [...existingStreamIds];
    removed = removedStreamIds.length;
    await db
      .delete(recurring)
      .where(
        and(
          eq(recurring.source, "plaid"),
          inArray(recurring.externalId, removedStreamIds)
        )
      );
  }

  await db
    .update(plaidConnection)
    .set({
      recurringUpdatedDatetime: updatedDatetime
        ? new Date(updatedDatetime)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(plaidConnection.plaidItemId, plaidItemId));

  return { added, modified, removed };
}
