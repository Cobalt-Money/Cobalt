import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Transaction, TransactionStream } from "plaid";

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

export async function persistTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const plaidAccountIds = [...new Set(transactions.map((t) => t.account_id))];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const records = transactions
    .map((tx) => {
      const ref = accountMap.get(tx.account_id);
      if (!ref) {
        return null;
      }
      return transactionToRecord(tx, ref.id, ref.userId);
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
        category: sql`CASE WHEN ${transactionTable.lockedFields} ? 'category' THEN ${transactionTable.category} ELSE excluded.category END`,
        categoryConfidence: sql`CASE WHEN ${transactionTable.lockedFields} ? 'category' THEN ${transactionTable.categoryConfidence} ELSE excluded.category_confidence END`,
        categoryDetail: sql`CASE WHEN ${transactionTable.lockedFields} ? 'category' THEN ${transactionTable.categoryDetail} ELSE excluded.category_detail END`,
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

  const postedTxs = await db
    .select({
      externalId: transactionTable.externalId,
      pendingTransactionId: transactionTable.pendingTransactionId,
    })
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.source, "plaid"),
        inArray(transactionTable.pendingTransactionId, pendingIds)
      )
    );

  let applied = 0;
  for (const posted of postedTxs) {
    const override = overrides.get(posted.pendingTransactionId ?? "");
    if (!override || posted.externalId === null) {
      continue;
    }

    await db
      .update(transactionTable)
      .set({
        category: override.lockedFields.includes("category")
          ? override.category
          : undefined,
        categoryDetail: override.lockedFields.includes("category")
          ? override.categoryDetail
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
  const pfc = s.personal_finance_category;
  return {
    category: pfc?.primary ?? null,
    categoryConfidence: pfc?.confidence_level ?? null,
    categoryDetail: pfc?.detailed ?? null,
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

  const rows = streams
    .map((s) => {
      const ref = accountMap.get(s.account_id);
      if (!ref) {
        return null;
      }
      return {
        ...mapRecurringStreamBase(s, today, ref.id, ref.userId),
        ...mapRecurringStreamMeta(s),
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
          category: sql`excluded.category`,
          categoryConfidence: sql`excluded.category_confidence`,
          categoryDetail: sql`excluded.category_detail`,
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

  const accountIdsForItem = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.plaidConnectionId, conn.id)
      )
    );
  const accountIdSet = new Set(accountIdsForItem.map((a) => a.id));

  const existingStreams = await db
    .select({
      accountId: recurring.accountId,
      externalId: recurring.externalId,
    })
    .from(recurring)
    .where(eq(recurring.source, "plaid"));

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
