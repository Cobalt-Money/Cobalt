import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
  bankConnection,
  recurringStream,
  transaction,
} from "@cobalt-web/db/schema/banking";
import { portfolioSnapshots } from "@cobalt-web/db/schema/brokerage";
import { fetchAccounts } from "@cobalt-web/server-data/plaid/link/actions";
import {
  fetchRecurringStreams,
  syncTransactionsPage,
} from "@cobalt-web/server-data/plaid/transactions/actions";
import {
  applyPendingOverrides,
  persistTransactions,
  removeTransactionsByIds,
} from "@cobalt-web/server-data/plaid/transactions/mutations";
import { getUserOverrides } from "@cobalt-web/server-data/plaid/transactions/queries";
import type { UserOverrides } from "@cobalt-web/server-data/plaid/transactions/queries";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AccountBase, TransactionStream } from "plaid";
import { FatalError, RetryableError } from "workflow";

function getTodayDateOnly(): string {
  return new Date().toISOString().split("T").at(0) ?? "";
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T").at(0) ?? "";
}

function isPlaidRateLimited(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "response" in error &&
    !!error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    (error.response as { status: number }).status === 429
  );
}

function getPlaidErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "error_code" in error.response.data &&
    typeof (error.response.data as { error_code: unknown }).error_code ===
      "string"
  ) {
    return (error.response.data as { error_code: string }).error_code;
  }
  return undefined;
}

export async function getPlaidItemStep(itemId: string) {
  "use step";

  const [item] = await db
    .select()
    .from(bankConnection)
    .where(eq(bankConnection.plaidItemId, itemId))
    .limit(1);

  if (!item) {
    throw new Error(`Plaid item not found: ${itemId}`);
  }

  return item;
}

export async function updateItemStateStep(params: {
  webhook_code: string;
  item_id: string | null;
  error?: unknown;
}) {
  "use step";

  const { webhook_code, item_id } = params;

  if (!item_id) {
    throw new FatalError(`ITEM webhook missing item_id: ${webhook_code}`);
  }

  switch (webhook_code) {
    case "NEW_ACCOUNTS_AVAILABLE": {
      await db
        .update(bankConnection)
        .set({ newAccountsAvailable: true, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "ERROR": {
      const errorPayload = params.error ?? null;
      await db
        .update(bankConnection)
        .set({
          error: errorPayload as (typeof bankConnection.$inferInsert)["error"],
          updatedAt: new Date(),
        })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "PENDING_DISCONNECT": {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(bankConnection)
        .set({ pendingDisconnectAt: sevenDaysFromNow, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "LOGIN_REPAIRED": {
      await db
        .update(bankConnection)
        .set({
          error: null,
          pendingDisconnectAt: null,
          updatedAt: new Date(),
        })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    default: {
      return { skipped: true, webhook_code };
    }
  }

  return { success: true, webhook_code };
}

export async function syncAccountsAndBalancesStep(
  accessToken: string,
  itemId: string
) {
  "use step";

  try {
    const accounts = await fetchAccounts(accessToken);

    await Promise.allSettled(
      accounts.map(async (account) => {
        await db
          .insert(bankAccount)
          .values({
            mask: account.mask || null,
            name: account.name || account.official_name || "Account",
            officialName: account.official_name || null,
            plaidAccountId: account.account_id,
            plaidItemId: itemId,
            subtype: account.subtype || null,
            type: account.type,
            verificationStatus: (account.verification_status as string) || null,
          })
          .onConflictDoNothing();

        await persistPlaidBalance(account);

        return { accountId: account.account_id, success: true };
      })
    );

    return { accounts, accountsCount: accounts.length };
  } catch (error) {
    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

export async function reconcileOrphanAccountsStep(
  accessToken: string,
  itemId: string
) {
  "use step";

  try {
    const [item] = await db
      .select({ userId: bankConnection.userId })
      .from(bankConnection)
      .where(eq(bankConnection.plaidItemId, itemId))
      .limit(1);

    if (!item) {
      return { migrated: 0, reconciled: 0 };
    }

    const plaidAccountsList = await fetchAccounts(accessToken);
    const plaidAccountIds = new Set(plaidAccountsList.map((a) => a.account_id));
    const dbAccounts = await db
      .select({
        mask: bankAccount.mask,
        name: bankAccount.name,
        plaidAccountId: bankAccount.plaidAccountId,
        subtype: bankAccount.subtype,
        type: bankAccount.type,
      })
      .from(bankAccount)
      .where(eq(bankAccount.plaidItemId, itemId));

    const orphanAccounts = dbAccounts.filter(
      (a) => !plaidAccountIds.has(a.plaidAccountId)
    );

    if (orphanAccounts.length === 0) {
      return { migrated: 0, reconciled: 0 };
    }

    let migrated = 0;

    for (const orphan of orphanAccounts) {
      const newAccount = findMatchingNewAccount(orphan, plaidAccountsList);

      if (newAccount) {
        await migrateSnapshotsToNewAccount(
          orphan.plaidAccountId,
          newAccount.account_id,
          item.userId
        );
        migrated += 1;
      }

      await db
        .delete(bankAccount)
        .where(
          and(
            eq(bankAccount.plaidItemId, itemId),
            eq(bankAccount.plaidAccountId, orphan.plaidAccountId)
          )
        );
    }

    return { migrated, reconciled: orphanAccounts.length };
  } catch (error) {
    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

function findMatchingNewAccount(
  orphan: {
    plaidAccountId: string;
    type: string;
    subtype: string | null;
    name: string;
    mask: string | null;
  },
  accounts: {
    account_id: string;
    type: string;
    subtype?: string | null;
    name?: string | null;
    official_name?: string | null;
    mask?: string | null;
  }[]
): { account_id: string } | null {
  const sameType = accounts.filter((a) => a.type === orphan.type);
  if (sameType.length === 0) {
    return null;
  }
  if (sameType.length === 1) {
    return sameType.at(0) ?? null;
  }
  const sameSubtype = sameType.filter(
    (a) => (a.subtype ?? null) === (orphan.subtype ?? null)
  );
  if (sameSubtype.length === 1) {
    return sameSubtype.at(0) ?? null;
  }
  const byName = sameSubtype.length > 0 ? sameSubtype : sameType;
  const orphanName = (orphan.name ?? "").toLowerCase();
  const orphanMask = orphan.mask ?? "";
  const match = byName.find((a) => {
    const name = (a.name ?? a.official_name ?? "").toLowerCase();
    const mask = a.mask ?? "";
    return name === orphanName || mask === orphanMask;
  });
  return match ?? byName[0] ?? null;
}

async function migrateSnapshotsToNewAccount(
  orphanId: string,
  newId: string,
  userId: string
): Promise<void> {
  const orphanSnapshots = await db
    .select({ snapshotDate: portfolioSnapshots.snapshotDate })
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.userId, userId),
        eq(portfolioSnapshots.accountId, orphanId)
      )
    );

  const newSnapshotsRaw = await db
    .select({ snapshotDate: portfolioSnapshots.snapshotDate })
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.userId, userId),
        eq(portfolioSnapshots.accountId, newId)
      )
    );
  const newSnapshotDates = new Set(newSnapshotsRaw.map((r) => r.snapshotDate));

  for (const row of orphanSnapshots) {
    const date = row.snapshotDate;
    await (newSnapshotDates.has(date)
      ? db
          .delete(portfolioSnapshots)
          .where(
            and(
              eq(portfolioSnapshots.userId, userId),
              eq(portfolioSnapshots.accountId, orphanId),
              eq(portfolioSnapshots.snapshotDate, date)
            )
          )
      : db
          .update(portfolioSnapshots)
          .set({ accountId: newId })
          .where(
            and(
              eq(portfolioSnapshots.userId, userId),
              eq(portfolioSnapshots.accountId, orphanId),
              eq(portfolioSnapshots.snapshotDate, date)
            )
          ));
  }

  const orphanBalanceSnapshots = await db
    .select({ snapshotDate: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, orphanId));

  const newBalanceDatesRaw = await db
    .select({ snapshotDate: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, newId));
  const newBalanceDates = new Set(
    newBalanceDatesRaw.map((r) => r.snapshotDate)
  );

  for (const row of orphanBalanceSnapshots) {
    const date = row.snapshotDate;
    await (newBalanceDates.has(date)
      ? db
          .delete(bankBalanceSnapshot)
          .where(
            and(
              eq(bankBalanceSnapshot.plaidAccountId, orphanId),
              eq(bankBalanceSnapshot.snapshotDate, date)
            )
          )
      : db
          .update(bankBalanceSnapshot)
          .set({ plaidAccountId: newId })
          .where(
            and(
              eq(bankBalanceSnapshot.plaidAccountId, orphanId),
              eq(bankBalanceSnapshot.snapshotDate, date)
            )
          ));
  }
}

export async function syncTransactionsStep(
  accessToken: string,
  itemId: string,
  cursor?: string | null
) {
  "use step";

  try {
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let currentCursor = cursor || undefined;
    let hasMore = true;

    const pendingOverrides = new Map<string, UserOverrides>();

    while (hasMore) {
      const page = await syncTransactionsPage(accessToken, currentCursor, 500);
      const { added, modified, removed, nextCursor, hasMore: more } = page;

      await persistTransactions([...added, ...modified]);

      if (removed.length > 0) {
        const removedIds = removed.map((tx) => tx.transaction_id);
        const overrides = await getUserOverrides(removedIds);
        for (const [id, override] of overrides) {
          pendingOverrides.set(id, override);
        }
        await removeTransactionsByIds(removedIds);
      }

      totalAdded += added.length;
      totalModified += modified.length;
      totalRemoved += removed.length;

      currentCursor = nextCursor;
      hasMore = more;

      await db
        .update(bankConnection)
        .set({ transactionsCursor: currentCursor, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, itemId));
    }

    await applyPendingOverrides(pendingOverrides);

    return {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    };
  } catch (error) {
    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

export async function syncBalancesStep(accessToken: string, _itemId: string) {
  "use step";

  try {
    const accounts = await fetchAccounts(accessToken);

    await Promise.allSettled(
      accounts.map((account) => persistPlaidBalance(account))
    );
    return { accounts };
  } catch (error) {
    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

export async function syncRecurringStep(accessToken: string, itemId: string) {
  "use step";

  try {
    const existingStreams = await db
      .select({ streamId: recurringStream.streamId })
      .from(recurringStream)
      .innerJoin(
        bankAccount,
        eq(recurringStream.plaidAccountId, bankAccount.plaidAccountId)
      )
      .where(eq(bankAccount.plaidItemId, itemId));

    const existingStreamIds = new Set(
      existingStreams
        .map((s) => s.streamId)
        .filter((id): id is string => id !== null)
    );

    const { inflowStreams, outflowStreams, updatedDatetime } =
      await fetchRecurringStreams(accessToken);

    const allStreams = [
      ...inflowStreams.map((stream) => ({
        ...stream,
        type: "inflow" as const,
      })),
      ...outflowStreams.map((stream) => ({
        ...stream,
        type: "outflow" as const,
      })),
    ];

    const totalAdded = allStreams.filter(
      (s) => !existingStreamIds.has(s.stream_id)
    ).length;
    const totalModified = allStreams.filter((s) =>
      existingStreamIds.has(s.stream_id)
    ).length;

    await batchUpsertRecurringStreams(allStreams);

    for (const stream of allStreams) {
      existingStreamIds.delete(stream.stream_id);
    }

    let totalRemoved = 0;
    if (existingStreamIds.size > 0) {
      const removedStreamIds = [...existingStreamIds];
      totalRemoved = removedStreamIds.length;
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
      .where(eq(bankConnection.plaidItemId, itemId));

    return {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      success: true,
    };
  } catch (error) {
    const errorCode = getPlaidErrorCode(error);

    if (errorCode === "PRODUCT_NOT_READY") {
      return { reason: "not_ready", success: false };
    }

    if (errorCode === "PRODUCT_NOT_ENABLED") {
      return { reason: "not_enabled", success: false };
    }

    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }

    throw error;
  }
}

export async function backfillHistoricalSnapshotsStep(
  accounts: {
    plaidAccountId: string;
    currentBalance: number;
    availableBalance: number | null;
    creditLimit: number | null;
  }[]
) {
  "use step";

  let totalCreated = 0;
  let totalSkipped = 0;
  let oldestDate: string | null = null;

  for (const account of accounts) {
    try {
      const result = await backfillAccountSnapshots(account);
      totalCreated += result.created;
      totalSkipped += result.skipped;

      if (
        result.oldestDate &&
        (!oldestDate || result.oldestDate < oldestDate)
      ) {
        ({ oldestDate } = result);
      }
    } catch {
      /* skip account on backfill failure */
    }
  }

  return {
    accountsProcessed: accounts.length,
    oldestDate,
    snapshotsCreated: totalCreated,
    snapshotsSkipped: totalSkipped,
  };
}

async function backfillAccountSnapshots(account: {
  plaidAccountId: string;
  currentBalance: number;
  availableBalance: number | null;
  creditLimit: number | null;
}): Promise<{ created: number; skipped: number; oldestDate: string | null }> {
  const { plaidAccountId, currentBalance, availableBalance, creditLimit } =
    account;

  const transactions = await db
    .select({ amount: transaction.amount, date: transaction.date })
    .from(transaction)
    .where(
      and(
        eq(transaction.plaidAccountId, plaidAccountId),
        eq(transaction.pending, false)
      )
    )
    .orderBy(desc(transaction.date));

  if (transactions.length === 0) {
    return { created: 0, oldestDate: null, skipped: 0 };
  }

  const oldestTxDate = transactions.at(-1)?.date;
  const newestTxDate = transactions[0]?.date;

  if (!oldestTxDate || !newestTxDate) {
    return { created: 0, oldestDate: null, skipped: 0 };
  }

  const dailyTotals = new Map<string, number>();
  for (const tx of transactions) {
    dailyTotals.set(tx.date, (dailyTotals.get(tx.date) ?? 0) + tx.amount);
  }

  const endDate = new Date();
  const startDate = new Date(oldestTxDate);
  const dates = getDateRange(startDate, endDate);
  const historicalBalances = calculateHistoricalBalances(
    currentBalance,
    dailyTotals,
    dates
  );

  const existingSnapshots = await db
    .select({ date: bankBalanceSnapshot.snapshotDate })
    .from(bankBalanceSnapshot)
    .where(eq(bankBalanceSnapshot.plaidAccountId, plaidAccountId));

  const existingDates = new Set(existingSnapshots.map((s) => s.date));
  const snapshotsToInsert = historicalBalances.filter(
    (snap) => !existingDates.has(snap.date)
  );

  const skipped = historicalBalances.length - snapshotsToInsert.length;
  const todayStr = getTodayDateOnly();
  const BATCH_SIZE = 100;
  let created = 0;

  for (let i = 0; i < snapshotsToInsert.length; i += BATCH_SIZE) {
    const batch = snapshotsToInsert.slice(i, i + BATCH_SIZE);
    await db
      .insert(bankBalanceSnapshot)
      .values(
        batch.map((snap) => ({
          availableBalance: snap.date === todayStr ? availableBalance : null,
          creditLimit,
          currentBalance: snap.balance,
          plaidAccountId,
          snapshotDate: snap.date,
          snapshotSource:
            snap.date === todayStr
              ? ("webhook" as const)
              : ("backfill" as const),
        }))
      )
      .onConflictDoNothing();
    created += batch.length;
  }

  return {
    created,
    oldestDate: historicalBalances[0]?.date ?? null,
    skipped,
  };
}

function getDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const endTime = endDate.getTime();
  let cur = new Date(startDate);
  while (cur.getTime() <= endTime) {
    dates.push(toDateOnlyString(cur));
    const next = new Date(cur);
    next.setDate(next.getDate() + 1);
    cur = next;
  }
  return dates;
}

function calculateHistoricalBalances(
  currentBalance: number,
  dailyTransactions: Map<string, number>,
  dates: string[]
): { date: string; balance: number }[] {
  const balances: { date: string; balance: number }[] = [];
  let runningBalance = currentBalance;

  const sortedDates = [...dates].toSorted((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    balances.push({ balance: runningBalance, date });
    const dayTotal = dailyTransactions.get(date) ?? 0;
    runningBalance += dayTotal;
  }

  return balances.toReversed();
}

async function persistPlaidBalance(account: AccountBase): Promise<void> {
  const existingBalance = await db
    .select()
    .from(bankBalance)
    .where(eq(bankBalance.plaidAccountId, account.account_id))
    .limit(1);

  const balanceData = {
    available: account.balances.available ?? null,
    current: account.balances.current ?? 0,
    isoCurrencyCode: account.balances.iso_currency_code || null,
    limit: account.balances.limit ?? null,
    plaidAccountId: account.account_id,
    unofficialCurrencyCode: account.balances.unofficial_currency_code || null,
  };

  await (existingBalance.length > 0
    ? db
        .update(bankBalance)
        .set({ ...balanceData, updatedAt: new Date() })
        .where(eq(bankBalance.plaidAccountId, account.account_id))
    : db.insert(bankBalance).values(balanceData));
}

const RECURRING_STREAM_BATCH_SIZE = 100;

type RecurringStreamRow = TransactionStream & { type: "inflow" | "outflow" };

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

async function batchUpsertRecurringStreams(
  streams: RecurringStreamRow[]
): Promise<void> {
  const today = getTodayDateOnly();

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

export function dispatchSnapshotWorkflowStep(_userId: string): void {
  "use step";
}
