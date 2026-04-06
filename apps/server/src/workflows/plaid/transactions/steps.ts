import { plaidClient } from "@cobalt-web/clients/plaid";
import type { bankBalanceSnapshot } from "@cobalt-web/db/schema/banking";
import {
  getTodayDateOnly,
  toDateOnlyString,
} from "@cobalt-web/server-data/lib/date";
import {
  insertBankAccountIgnoreConflict,
  upsertBankBalanceFromPlaidAccount,
} from "@cobalt-web/server-data/plaid/item/mutations";
import {
  applyPendingOverrides,
  getUserOverrides,
  persistTransactions,
  removeTransactionsByIds,
} from "@cobalt-web/server-data/plaid/item/transaction-persistence";
import type { UserOverrides } from "@cobalt-web/server-data/plaid/item/transaction-persistence";
import {
  batchUpsertRecurringStreamRows,
  deleteBankAccountForPlaidItem,
  deleteRecurringStreamsByStreamIds,
  getBankConnectionUserIdByPlaidItemId,
  insertBackfillBankBalanceSnapshotBatch,
  listBankAccountsForRelinkByPlaidItem,
  listBankBalanceSnapshotDatesForAccount,
  listPostedTransactionsAmountAndDateForAccount,
  listRecurringStreamIdsForPlaidItem,
  migrateRelinkSnapshotsToNewAccountIds,
  setRecurringUpdatedDatetimeForPlaidItem,
  setTransactionsCursorForPlaidItem,
  upsertOrInsertTodayBalanceSnapshotFromPlaidAccount,
  upsertTodayBankBalanceSnapshotsFromAccounts,
} from "@cobalt-web/server-data/plaid/item/transactions-sync";
import type { AccountBase, TransactionStream } from "plaid";
import { RetryableError } from "workflow";
import { start } from "workflow/api";

import { snapshotUserWorkflow } from "../../snapshots/workflow";

/** Extract Plaid API error code from an unknown error object. */
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
    typeof error.response.data.error_code === "string"
  ) {
    return error.response.data.error_code;
  }
  return undefined;
}

/** Check if a Plaid error is a 429 rate-limit and throw RetryableError. */
function throwIfRateLimited(error: unknown): void {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    error.response.status === 429
  ) {
    throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
  }
}

/**
 * Step: Sync accounts and balances (first-time setup)
 * Used when item has no transactions cursor (initial sync)
 */
export async function syncAccountsAndBalancesStep(
  accessToken: string,
  itemId: string
) {
  "use step";

  try {
    const accountsGet = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const { accounts } = accountsGet.data;

    await Promise.allSettled(
      accounts.map(async (account) => {
        await insertBankAccountIgnoreConflict(itemId, account);
        await upsertBankBalanceFromPlaidAccount(account);
        return { accountId: account.account_id, success: true };
      })
    );

    return { accounts, accountsCount: accounts.length };
  } catch (error: unknown) {
    throwIfRateLimited(error);
    throw error;
  }
}

/**
 * Step: Reconcile orphan accounts after re-link.
 * When a user re-links, Plaid returns new account IDs. We detect orphans (DB accounts
 * Plaid no longer returns), match them to new accounts, migrate snapshots, then delete.
 */
export async function reconcileOrphanAccountsStep(
  accessToken: string,
  itemId: string
) {
  "use step";

  try {
    const userId = await getBankConnectionUserIdByPlaidItemId(itemId);

    if (!userId) {
      return { migrated: 0, reconciled: 0 };
    }

    const accountsGet = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const plaidAccountIds = new Set(
      accountsGet.data.accounts.map((a) => a.account_id)
    );
    const dbAccounts = await listBankAccountsForRelinkByPlaidItem(itemId);

    const orphanAccounts = dbAccounts.filter(
      (a) => !plaidAccountIds.has(a.plaidAccountId)
    );
    const plaidAccountsList = accountsGet.data.accounts;

    if (orphanAccounts.length === 0) {
      return { migrated: 0, reconciled: 0 };
    }

    let migrated = 0;

    for (const orphan of orphanAccounts) {
      const newAccount = findMatchingNewAccount(orphan, plaidAccountsList);

      if (newAccount) {
        await migrateRelinkSnapshotsToNewAccountIds({
          newPlaidAccountId: newAccount.account_id,
          orphanPlaidAccountId: orphan.plaidAccountId,
          userId,
        });
        migrated += 1;
      }

      await deleteBankAccountForPlaidItem(itemId, orphan.plaidAccountId);
    }

    return { migrated, reconciled: orphanAccounts.length };
  } catch (error: unknown) {
    throwIfRateLimited(error);
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
  plaidAccounts: {
    account_id: string;
    type: string;
    subtype?: string | null;
    name?: string | null;
    official_name?: string | null;
    mask?: string | null;
  }[]
): { account_id: string } | null {
  const sameType = plaidAccounts.filter((a) => a.type === orphan.type);
  if (sameType.length === 0) {
    return null;
  }
  if (sameType.length === 1) {
    const [match] = sameType;
    if (!match) {
      return null;
    }
    return match;
  }
  const sameSubtype = sameType.filter(
    (a) => (a.subtype ?? null) === (orphan.subtype ?? null)
  );
  if (sameSubtype.length === 1) {
    const [subtypeMatch] = sameSubtype;
    if (!subtypeMatch) {
      return null;
    }
    return subtypeMatch;
  }
  const byName = sameSubtype.length > 0 ? sameSubtype : sameType;
  const orphanName = (orphan.name ?? "").toLowerCase();
  const orphanMask = orphan.mask ?? "";
  const nameMatch = byName.find((a) => {
    const accountName = (a.name ?? a.official_name ?? "").toLowerCase();
    const accountMask = a.mask ?? "";
    return accountName === orphanName || accountMask === orphanMask;
  });
  return nameMatch ?? byName[0] ?? null;
}

/**
 * Step: Sync transactions
 * Handles pagination and cursor updates
 */
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
      const resp = await plaidClient.transactionsSync({
        access_token: accessToken,
        count: 500,
        cursor: currentCursor,
        options: {
          include_personal_finance_category: true,
        },
      });

      const { added, modified, removed, next_cursor, has_more } = resp.data;

      const upsert = [...added, ...modified];
      await persistTransactions(upsert);

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

      currentCursor = next_cursor;
      hasMore = has_more;

      await setTransactionsCursorForPlaidItem(itemId, currentCursor);
    }

    await applyPendingOverrides(pendingOverrides);

    return {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    };
  } catch (error: unknown) {
    throwIfRateLimited(error);
    throw error;
  }
}

/**
 * Step: Sync balances
 * Updates account balances from Plaid API
 */
export async function syncBalancesStep(accessToken: string, _itemId: string) {
  "use step";

  try {
    const accountsGet = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const { accounts } = accountsGet.data;

    await Promise.allSettled(
      accounts.map((account) => upsertBankBalanceFromPlaidAccount(account))
    );

    return { accounts };
  } catch (error: unknown) {
    throwIfRateLimited(error);
    throw error;
  }
}

/**
 * Step: Sync recurring transactions
 * Only called when historical update is complete
 */
export async function syncRecurringStep(accessToken: string, itemId: string) {
  "use step";

  try {
    const streamIdRows = await listRecurringStreamIdsForPlaidItem(itemId);

    const existingStreamIds = new Set(
      streamIdRows.filter((id): id is string => id !== null)
    );

    const response = await plaidClient.transactionsRecurringGet({
      access_token: accessToken,
    });

    const { inflow_streams, outflow_streams, updated_datetime } = response.data;

    const allStreams = [
      ...(inflow_streams || []).map((stream) => ({
        ...stream,
        type: "inflow" as const,
      })),
      ...(outflow_streams || []).map((stream) => ({
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

    const rows = allStreams.map((s) => mapStreamToRow(s, getTodayDateOnly()));
    await batchUpsertRecurringStreamRows(rows);

    for (const stream of allStreams) {
      existingStreamIds.delete(stream.stream_id);
    }

    let totalRemoved = 0;
    if (existingStreamIds.size > 0) {
      const removedStreamIds = [...existingStreamIds];
      totalRemoved = removedStreamIds.length;

      await deleteRecurringStreamsByStreamIds(removedStreamIds);
    }

    await setRecurringUpdatedDatetimeForPlaidItem(itemId, updated_datetime);

    return {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      success: true,
    };
  } catch (error: unknown) {
    const errorCode = getPlaidErrorCode(error);

    if (errorCode === "PRODUCT_NOT_READY") {
      return { reason: "not_ready", success: false };
    }

    if (errorCode === "PRODUCT_NOT_ENABLED") {
      return { reason: "not_enabled", success: false };
    }

    throwIfRateLimited(error);
    throw error;
  }
}

/**
 * Step: Create balance snapshots for all accounts
 * Creates or updates daily balance snapshots from Plaid account data
 * @param accounts - Array of AccountBase from plaidClient.accountsGet().data.accounts
 */
export async function createBalanceSnapshotsStep(accounts: AccountBase[]) {
  "use step";

  const snapshotDate = getTodayDateOnly();
  let created = 0;
  let updated = 0;

  const results = await Promise.allSettled(
    accounts.map((account) =>
      upsertOrInsertTodayBalanceSnapshotFromPlaidAccount({
        account,
        snapshotDate,
      })
    )
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value === "created") {
        created += 1;
      } else {
        updated += 1;
      }
    }
  }

  return { created, total: accounts.length, updated };
}

/**
 * Step: Upsert today's balance snapshots for a set of accounts.
 * Called on every SYNC_UPDATES_AVAILABLE webhook so snapshots reflect the latest
 * balance data without waiting for the daily cron.
 * Uses onConflictDoUpdate so fresh webhook data overwrites stale cron data.
 */
export function upsertTodaySnapshotsStep(
  accounts: {
    plaidAccountId: string;
    currentBalance: number;
    availableBalance: number | null;
    creditLimit: number | null;
  }[]
): Promise<{ upserted: number }> {
  "use step";

  if (accounts.length === 0) {
    return Promise.resolve({ upserted: 0 });
  }

  return upsertTodayBankBalanceSnapshotsFromAccounts({
    accounts,
    snapshotDate: getTodayDateOnly(),
  });
}

/**
 * Step: Backfill historical balance snapshots (including today)
 * Calculates historical daily balances by walking backwards from current balance
 * using all available transaction history.
 */
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
      // Continue with other accounts even if one fails
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

  const transactions =
    await listPostedTransactionsAmountAndDateForAccount(plaidAccountId);

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
    const current = dailyTotals.get(tx.date) || 0;
    dailyTotals.set(tx.date, current + tx.amount);
  }

  const endDate = new Date();
  const startDate = new Date(oldestTxDate);
  const dates = getDateRange(startDate, endDate);

  const historicalBalances = calculateHistoricalBalances(
    currentBalance,
    dailyTotals,
    dates
  );

  const existingDatesList =
    await listBankBalanceSnapshotDatesForAccount(plaidAccountId);
  const existingDates = new Set(existingDatesList);

  const snapshotsToInsert = historicalBalances.filter(
    (snap) => !existingDates.has(snap.date)
  );

  let created = 0;
  const skipped = historicalBalances.length - snapshotsToInsert.length;

  const todayStr = getTodayDateOnly();

  const BATCH_SIZE = 100;
  for (let i = 0; i < snapshotsToInsert.length; i += BATCH_SIZE) {
    const batch = snapshotsToInsert.slice(i, i + BATCH_SIZE);

    await insertBackfillBankBalanceSnapshotBatch(
      batch.map((snap): typeof bankBalanceSnapshot.$inferInsert => ({
        availableBalance: snap.date === todayStr ? availableBalance : null,
        creditLimit,
        currentBalance: snap.balance,
        plaidAccountId,
        snapshotDate: snap.date,
        snapshotSource:
          snap.date === todayStr ? ("webhook" as const) : ("backfill" as const),
      }))
    );

    created += batch.length;
  }

  return {
    created,
    oldestDate: historicalBalances[0]?.date || null,
    skipped,
  };
}

function getDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const endTime = endDate.getTime();

  for (
    let currentTime = startDate.getTime();
    currentTime <= endTime;
    currentTime += 86_400_000
  ) {
    dates.push(toDateOnlyString(new Date(currentTime)));
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
    balances.push({
      balance: runningBalance,
      date,
    });

    const dayTotal = dailyTransactions.get(date) || 0;
    runningBalance += dayTotal;
  }

  return balances.toReversed();
}

function isStreamActive(stream: TransactionStream, today: string): boolean {
  if (
    stream.is_active &&
    stream.predicted_next_date &&
    stream.predicted_next_date < today
  ) {
    return false;
  }
  return stream.is_active ?? false;
}

function mapPersonalFinanceCategory(
  category: TransactionStream["personal_finance_category"]
) {
  if (!category) {
    return null;
  }
  return {
    confidence_level: category.confidence_level ?? "UNKNOWN",
    detailed: category.detailed,
    primary: category.primary,
  };
}

function mapStreamToRow(
  s: TransactionStream & { type: "inflow" | "outflow" },
  today: string
) {
  return {
    averageAmount: s.average_amount?.amount ?? 0,
    category: s.category ?? null,
    categoryId: s.category_id ?? null,
    description: s.description ?? "",
    firstDate: s.first_date,
    frequency: s.frequency ?? "UNKNOWN",
    isActive: isStreamActive(s, today),
    isUserModified: s.is_user_modified ?? false,
    lastAmount: s.last_amount?.amount ?? 0,
    lastDate: s.last_date ?? s.first_date,
    lastUserModifiedDatetime: s.last_user_modified_datetime ?? null,
    merchantName: s.merchant_name ?? null,
    personalFinanceCategory: mapPersonalFinanceCategory(
      s.personal_finance_category
    ),
    plaidAccountId: s.account_id,
    predictedNextDate: s.predicted_next_date ?? null,
    status: s.status ?? "UNKNOWN",
    streamId: s.stream_id,
    streamType: s.type,
    transactionIds: s.transaction_ids ?? [],
  };
}

/**
 * Step: Dispatch the snapshotUserWorkflow for a given user.
 * start() from "workflow/api" must be called inside a "use step" function —
 * the workflow VM sandbox does not have access to the scheduler runtime.
 */
export async function dispatchSnapshotWorkflowStep(
  userId: string
): Promise<void> {
  "use step";

  await start(snapshotUserWorkflow, [userId]);
}
