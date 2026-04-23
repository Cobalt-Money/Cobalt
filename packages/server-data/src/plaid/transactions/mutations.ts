import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankConnection,
  recurringStream,
  transaction as transactionTable,
} from "@cobalt-web/db/schema/banking";
import { eq, inArray, sql } from "drizzle-orm";
import type { Transaction, TransactionStream } from "plaid";

import { fetchRecurringStreams } from "./actions.js";
import { transactionToRecord } from "./lib.js";
import type { UserOverrides } from "./queries.js";

/** Persist the /transactions/sync cursor so the next page picks up where we left off. */
export async function setTransactionsCursor(
  plaidItemId: string,
  cursor: string | undefined
): Promise<void> {
  await db
    .update(bankConnection)
    .set({ transactionsCursor: cursor, updatedAt: new Date() })
    .where(eq(bankConnection.plaidItemId, plaidItemId));
}

export async function persistTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const records = transactions.map(transactionToRecord);

  await db
    .insert(transactionTable)
    .values(records)
    .onConflictDoUpdate({
      set: {
        accountOwner: sql`excluded.account_owner`,
        amount: sql`excluded.amount`,
        authorizedDate: sql`excluded.authorized_date`,
        authorizedDatetime: sql`excluded.authorized_datetime`,
        category: sql`excluded.category`,
        categoryId: sql`excluded.category_id`,
        checkNumber: sql`excluded.check_number`,
        counterparties: sql`excluded.counterparties`,
        date: sql`excluded.date`,
        datetime: sql`excluded.datetime`,
        isoCurrencyCode: sql`excluded.iso_currency_code`,
        location: sql`excluded.location`,
        logoUrl: sql`excluded.logo_url`,
        merchantEntityId: sql`excluded.merchant_entity_id`,
        merchantName: sql`excluded.merchant_name`,
        name: sql`excluded.name`,
        originalDescription: sql`excluded.original_description`,
        paymentChannel: sql`excluded.payment_channel`,
        paymentMeta: sql`excluded.payment_meta`,
        pending: sql`excluded.pending`,
        pendingTransactionId: sql`excluded.pending_transaction_id`,
        personalFinanceCategory: sql`excluded.personal_finance_category`,
        personalFinanceCategoryIconUrl: sql`excluded.personal_finance_category_icon_url`,
        plaidAccountId: sql`excluded.plaid_account_id`,
        transactionCode: sql`excluded.transaction_code`,
        transactionType: sql`excluded.transaction_type`,
        unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
        updatedAt: sql`now()`,
        website: sql`excluded.website`,
      },
      target: [transactionTable.plaidTransactionId],
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
    .where(inArray(transactionTable.plaidTransactionId, transactionIds));
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
      pendingTransactionId: transactionTable.pendingTransactionId,
      plaidTransactionId: transactionTable.plaidTransactionId,
    })
    .from(transactionTable)
    .where(inArray(transactionTable.pendingTransactionId, pendingIds));

  let applied = 0;
  for (const posted of postedTxs) {
    const override = overrides.get(posted.pendingTransactionId ?? "");
    if (!override) {
      continue;
    }

    await db
      .update(transactionTable)
      .set({
        updatedAt: new Date(),
        userOverrideCategory: override.userOverrideCategory,
        userOverrideName: override.userOverrideName,
      })
      .where(
        eq(transactionTable.plaidTransactionId, posted.plaidTransactionId)
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

function mapRecurringStreamBase(s: RecurringStreamRow, today: string) {
  const isActive =
    s.is_active && s.predicted_next_date && s.predicted_next_date < today
      ? false
      : (s.is_active ?? false);
  return {
    averageAmount: s.average_amount?.amount ?? 0,
    firstDate: s.first_date,
    isActive,
    isUserModified: s.is_user_modified ?? false,
    lastAmount: s.last_amount?.amount ?? 0,
    lastDate: s.last_date ?? s.first_date,
    plaidAccountId: s.account_id,
    streamId: s.stream_id,
    streamType: s.type,
  };
}

function mapRecurringStreamMeta(s: RecurringStreamRow) {
  return {
    category: s.category ?? null,
    categoryId: s.category_id ?? null,
    description: s.description ?? "",
    frequency: s.frequency ?? "UNKNOWN",
    lastUserModifiedDatetime: s.last_user_modified_datetime ?? null,
    merchantName: s.merchant_name ?? null,
    personalFinanceCategory: s.personal_finance_category
      ? {
          confidence_level:
            s.personal_finance_category.confidence_level ?? "UNKNOWN",
          detailed: s.personal_finance_category.detailed,
          primary: s.personal_finance_category.primary,
        }
      : null,
    predictedNextDate: s.predicted_next_date ?? null,
    status: s.status ?? "UNKNOWN",
    transactionIds: s.transaction_ids ?? [],
  };
}

async function upsertRecurringStreams(
  streams: RecurringStreamRow[]
): Promise<void> {
  const today = todayDateOnly();

  const rows = streams.map((s) => ({
    ...mapRecurringStreamBase(s, today),
    ...mapRecurringStreamMeta(s),
  }));

  for (let i = 0; i < rows.length; i += RECURRING_STREAM_BATCH_SIZE) {
    const batch = rows.slice(i, i + RECURRING_STREAM_BATCH_SIZE);
    await db
      .insert(recurringStream)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          averageAmount: sql`excluded.average_amount`,
          category: sql`excluded.category`,
          categoryId: sql`excluded.category_id`,
          description: sql`excluded.description`,
          frequency: sql`excluded.frequency`,
          isActive: sql`excluded.is_active`,
          isUserModified: sql`excluded.is_user_modified`,
          lastAmount: sql`excluded.last_amount`,
          lastDate: sql`excluded.last_date`,
          lastUserModifiedDatetime: sql`excluded.last_user_modified_datetime`,
          merchantName: sql`excluded.merchant_name`,
          personalFinanceCategory: sql`excluded.personal_finance_category`,
          predictedNextDate: sql`excluded.predicted_next_date`,
          status: sql`excluded.status`,
          transactionIds: sql`excluded.transaction_ids`,
          updatedAt: new Date(),
        },
        target: recurringStream.streamId,
      });
  }
}

/**
 * Fetch recurring streams from Plaid, reconcile against existing streams for
 * this item (upsert present, delete absent), and record the Plaid
 * `updatedDatetime` on bankConnection. Returns counts for telemetry.
 */
export async function syncRecurringForItem(
  accessToken: string,
  plaidItemId: string
): Promise<{ added: number; modified: number; removed: number }> {
  const existingStreams = await db
    .select({ streamId: recurringStream.streamId })
    .from(recurringStream)
    .innerJoin(
      bankAccount,
      eq(recurringStream.plaidAccountId, bankAccount.plaidAccountId)
    )
    .where(eq(bankAccount.plaidItemId, plaidItemId));

  const existingStreamIds = new Set(
    existingStreams
      .map((s) => s.streamId)
      .filter((id): id is string => id !== null)
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
      .delete(recurringStream)
      .where(inArray(recurringStream.streamId, removedStreamIds));
  }

  await db
    .update(bankConnection)
    .set({
      recurringUpdatedDatetime: updatedDatetime,
      updatedAt: new Date(),
    })
    .where(eq(bankConnection.plaidItemId, plaidItemId));

  return { added, modified, removed };
}
