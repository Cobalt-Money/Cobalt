import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalanceSnapshot,
  bankConnection,
  recurringStream,
  transaction,
} from "@cobalt-web/db/schema/banking";
import { portfolioSnapshots } from "@cobalt-web/db/schema/brokerage";
import { insertBankBalanceSnapshots } from "@cobalt-web/server-data/banking/snapshots-mutations";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AccountBase } from "plaid";

const RECURRING_STREAM_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Bank connection
// ---------------------------------------------------------------------------

export async function getBankConnectionUserIdByPlaidItemId(
  plaidItemId: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: bankConnection.userId })
    .from(bankConnection)
    .where(eq(bankConnection.plaidItemId, plaidItemId))
    .limit(1);

  return row?.userId ?? null;
}

export async function setTransactionsCursorForPlaidItem(
  plaidItemId: string,
  cursor: string
): Promise<void> {
  await db
    .update(bankConnection)
    .set({
      transactionsCursor: cursor,
      updatedAt: new Date(),
    })
    .where(eq(bankConnection.plaidItemId, plaidItemId));
}

export async function setRecurringUpdatedDatetimeForPlaidItem(
  plaidItemId: string,
  recurringUpdatedDatetime: string | null
): Promise<void> {
  await db
    .update(bankConnection)
    .set({
      recurringUpdatedDatetime,
      updatedAt: new Date(),
    })
    .where(eq(bankConnection.plaidItemId, plaidItemId));
}

// ---------------------------------------------------------------------------
// Accounts (re-link / orphan reconciliation)
// ---------------------------------------------------------------------------

export interface BankAccountRelinkRow {
  mask: string | null;
  name: string;
  plaidAccountId: string;
  subtype: string | null;
  type: string;
}

export function listBankAccountsForRelinkByPlaidItem(
  plaidItemId: string
): Promise<BankAccountRelinkRow[]> {
  return db
    .select({
      mask: bankAccount.mask,
      name: bankAccount.name,
      plaidAccountId: bankAccount.plaidAccountId,
      subtype: bankAccount.subtype,
      type: bankAccount.type,
    })
    .from(bankAccount)
    .where(eq(bankAccount.plaidItemId, plaidItemId));
}

export async function deleteBankAccountForPlaidItem(
  plaidItemId: string,
  plaidAccountId: string
): Promise<void> {
  await db
    .delete(bankAccount)
    .where(
      and(
        eq(bankAccount.plaidItemId, plaidItemId),
        eq(bankAccount.plaidAccountId, plaidAccountId)
      )
    );
}

/**
 * Move portfolio + bank balance snapshots from a removed Plaid account id to the replacement id.
 */
export async function migrateRelinkSnapshotsToNewAccountIds(params: {
  newPlaidAccountId: string;
  orphanPlaidAccountId: string;
  userId: string;
}): Promise<void> {
  const { newPlaidAccountId, orphanPlaidAccountId, userId } = params;

  const orphanSnapshots = await db
    .select({ snapshotDate: portfolioSnapshots.snapshotDate })
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.userId, userId),
        eq(portfolioSnapshots.accountId, orphanPlaidAccountId)
      )
    );

  const newSnapshotRows = await db
    .select({ snapshotDate: portfolioSnapshots.snapshotDate })
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.userId, userId),
        eq(portfolioSnapshots.accountId, newPlaidAccountId)
      )
    );
  const newSnapshotDates = new Set(newSnapshotRows.map((r) => r.snapshotDate));

  for (const row of orphanSnapshots) {
    const date = row.snapshotDate;
    const snapshotCondition = and(
      eq(portfolioSnapshots.userId, userId),
      eq(portfolioSnapshots.accountId, orphanPlaidAccountId),
      eq(portfolioSnapshots.snapshotDate, date)
    );
    await (newSnapshotDates.has(date)
      ? db.delete(portfolioSnapshots).where(snapshotCondition)
      : db
          .update(portfolioSnapshots)
          .set({ accountId: newPlaidAccountId })
          .where(snapshotCondition));
  }

  const orphanBalanceSnapshots = await db
    .select({ snapshotDate: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, orphanPlaidAccountId));

  const newBalanceRows = await db
    .select({ snapshotDate: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, newPlaidAccountId));
  const newBalanceDates = new Set(newBalanceRows.map((r) => r.snapshotDate));

  for (const row of orphanBalanceSnapshots) {
    const date = row.snapshotDate;
    const balanceCondition = and(
      eq(bankBalanceSnapshot.plaidAccountId, orphanPlaidAccountId),
      eq(bankBalanceSnapshot.snapshotDate, date)
    );
    await (newBalanceDates.has(date)
      ? db.delete(bankBalanceSnapshot).where(balanceCondition)
      : db
          .update(bankBalanceSnapshot)
          .set({ plaidAccountId: newPlaidAccountId })
          .where(balanceCondition));
  }
}

// ---------------------------------------------------------------------------
// Recurring streams
// ---------------------------------------------------------------------------

export async function listRecurringStreamIdsForPlaidItem(
  plaidItemId: string
): Promise<(string | null)[]> {
  const rows = await db
    .select({ streamId: recurringStream.streamId })
    .from(recurringStream)
    .innerJoin(
      bankAccount,
      eq(recurringStream.plaidAccountId, bankAccount.plaidAccountId)
    )
    .where(eq(bankAccount.plaidItemId, plaidItemId));

  return rows.map((s) => s.streamId);
}

export async function deleteRecurringStreamsByStreamIds(
  streamIds: string[]
): Promise<void> {
  if (streamIds.length === 0) {
    return;
  }
  await db
    .delete(recurringStream)
    .where(inArray(recurringStream.streamId, streamIds));
}

export async function batchUpsertRecurringStreamRows(
  rows: (typeof recurringStream.$inferInsert)[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

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

// ---------------------------------------------------------------------------
// Balance snapshots (cron / webhook / backfill)
// ---------------------------------------------------------------------------

export async function upsertOrInsertTodayBalanceSnapshotFromPlaidAccount(params: {
  account: AccountBase;
  snapshotDate: string;
}): Promise<"created" | "updated"> {
  const { account, snapshotDate } = params;

  const existing = await db
    .select({ id: bankBalanceSnapshot.id })
    .from(bankBalanceSnapshot)
    .where(
      and(
        eq(bankBalanceSnapshot.plaidAccountId, account.account_id),
        eq(bankBalanceSnapshot.snapshotDate, snapshotDate)
      )
    )
    .limit(1);

  const [existingSnapshot] = existing;
  if (existingSnapshot) {
    await db
      .update(bankBalanceSnapshot)
      .set({
        availableBalance: account.balances.available ?? null,
        creditLimit: account.balances.limit ?? null,
        currentBalance: account.balances.current ?? 0,
        snapshotDate,
      })
      .where(eq(bankBalanceSnapshot.id, existingSnapshot.id));
    return "updated";
  }

  await db.insert(bankBalanceSnapshot).values({
    availableBalance: account.balances.available ?? null,
    creditLimit: account.balances.limit ?? null,
    currentBalance: account.balances.current ?? 0,
    plaidAccountId: account.account_id,
    snapshotDate,
    snapshotSource: "webhook",
  });
  return "created";
}

export async function upsertTodayBankBalanceSnapshotsFromAccounts(params: {
  accounts: {
    availableBalance: number | null;
    creditLimit: number | null;
    currentBalance: number;
    plaidAccountId: string;
  }[];
  snapshotDate: string;
}): Promise<{ upserted: number }> {
  const { accounts, snapshotDate } = params;
  if (accounts.length === 0) {
    return { upserted: 0 };
  }

  await insertBankBalanceSnapshots(
    accounts.map((a) => ({
      availableBalance: a.availableBalance,
      creditLimit: a.creditLimit,
      currentBalance: a.currentBalance,
      plaidAccountId: a.plaidAccountId,
      snapshotDate,
      snapshotSource: "webhook",
    }))
  );

  return { upserted: accounts.length };
}

export function listPostedTransactionsAmountAndDateForAccount(
  plaidAccountId: string
): Promise<{ amount: number; date: string }[]> {
  return db
    .select({
      amount: transaction.amount,
      date: transaction.date,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.plaidAccountId, plaidAccountId),
        eq(transaction.pending, false)
      )
    )
    .orderBy(desc(transaction.date));
}

export async function listBankBalanceSnapshotDatesForAccount(
  plaidAccountId: string
): Promise<string[]> {
  const rows = await db
    .select({ date: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, plaidAccountId));

  return rows.map((s) => s.date);
}

export async function insertBackfillBankBalanceSnapshotBatch(
  rows: (typeof bankBalanceSnapshot.$inferInsert)[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.insert(bankBalanceSnapshot).values(rows).onConflictDoNothing();
}
