import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalanceSnapshot,
  bankConnection,
} from "@cobalt-web/db/schema/banking";
import { portfolioSnapshots } from "@cobalt-web/db/schema/brokerage";
import {
  exchangePublicToken,
  fetchAccounts,
  fetchItemAndAccounts,
  removeItem,
  triggerPlaidSync,
} from "@cobalt-web/server-data/plaid/link/actions";
import { bankAccountInsertFromPlaid } from "@cobalt-web/server-data/plaid/link/lib";
import {
  applyItemWebhookState,
  clearItemError,
  persistOnboardingItem,
  syncNewAccountsForItem,
  upsertBalanceForPlaidAccount,
} from "@cobalt-web/server-data/plaid/link/mutations";
import {
  checkForDuplicateAccounts,
  getBankConnectionByItemId,
} from "@cobalt-web/server-data/plaid/link/queries";
import { insertBalanceSnapshots } from "@cobalt-web/server-data/plaid/snapshots/mutations";
import {
  getPostedTransactionsForAccount,
  getSnapshotDatesForAccount,
} from "@cobalt-web/server-data/plaid/snapshots/queries";
import { syncTransactionsPage } from "@cobalt-web/server-data/plaid/transactions/actions";
import {
  applyPendingOverrides,
  persistTransactions,
  removeTransactionsByIds,
  setTransactionsCursor,
  syncRecurringForItem,
} from "@cobalt-web/server-data/plaid/transactions/mutations";
import { getUserOverrides } from "@cobalt-web/server-data/plaid/transactions/queries";
import type { UserOverrides } from "@cobalt-web/server-data/plaid/transactions/queries";
import { and, eq, sql } from "drizzle-orm";
import type { AccountBase } from "plaid";
import { FatalError, RetryableError, getWritable } from "workflow";

export type PlaidOnboardingPhase =
  | "exchange"
  | "validate"
  | "duplicate"
  | "persist"
  | "connecting"
  | "waiting_for_link"
  | "waiting_for_plaid"
  | "accounts"
  | "balances"
  | "transactions"
  | "historical"
  | "holdings"
  | "investment_transactions"
  | "liabilities"
  | "done"
  | "cancelled"
  | "error";

export interface PlaidOnboardingProgress {
  phase: PlaidOnboardingPhase;
  status: "start" | "done";
  itemId: string;
  detail?: Record<string, unknown>;
  at: number;
}

export async function emitOnboardingProgressStep(
  event: Omit<PlaidOnboardingProgress, "at">
) {
  "use step";

  const writer = getWritable<PlaidOnboardingProgress>({
    namespace: "progress",
  }).getWriter();
  try {
    await writer.write({ ...event, at: Date.now() });
  } finally {
    writer.releaseLock();
  }
}

export async function closeOnboardingProgressStep() {
  "use step";

  await getWritable<PlaidOnboardingProgress>({
    namespace: "progress",
  }).close();
}

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

  return await getBankConnectionByItemId(itemId);
}

export async function updateItemStateStep(params: {
  webhook_code: string;
  item_id: string | null;
  error?: unknown;
}) {
  "use step";

  if (!params.item_id) {
    throw new FatalError(
      `ITEM webhook missing item_id: ${params.webhook_code}`
    );
  }

  const result = await applyItemWebhookState({
    error: params.error,
    plaidItemId: params.item_id,
    webhookCode: params.webhook_code,
  });

  return "skipped" in result
    ? { skipped: true, webhook_code: result.webhookCode }
    : { success: true, webhook_code: result.webhookCode };
}

export async function syncAccountsAndBalancesStep(
  accessToken: string,
  itemId: string
) {
  "use step";

  try {
    const accounts = await fetchAccounts(accessToken);
    const toInsert = bankAccountInsertFromPlaid(itemId);

    await Promise.allSettled(
      accounts.map(async (account) => {
        await db
          .insert(bankAccount)
          .values(toInsert(account))
          .onConflictDoUpdate({
            set: {
              persistentAccountId: sql`coalesce(${bankAccount.persistentAccountId}, excluded.persistent_account_id)`,
              updatedAt: new Date(),
            },
            target: bankAccount.plaidAccountId,
          });

        await upsertBalanceForPlaidAccount(account);

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
        persistentAccountId: bankAccount.persistentAccountId,
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
    persistentAccountId: string | null;
    type: string;
    subtype: string | null;
    name: string;
    mask: string | null;
  },
  accounts: {
    account_id: string;
    persistent_account_id?: string | null;
    type: string;
    subtype?: string | null;
    name?: string | null;
    official_name?: string | null;
    mask?: string | null;
  }[]
): { account_id: string } | null {
  if (orphan.persistentAccountId) {
    const byPersistentId = accounts.find(
      (a) => a.persistent_account_id === orphan.persistentAccountId
    );
    if (byPersistentId) {
      return byPersistentId;
    }
  }

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

      await setTransactionsCursor(itemId, currentCursor);
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
      accounts.map((account) => upsertBalanceForPlaidAccount(account))
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
    const result = await syncRecurringForItem(accessToken, itemId);
    return { ...result, success: true as const };
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

  const transactions = await getPostedTransactionsForAccount(plaidAccountId);

  if (transactions.length === 0) {
    return { created: 0, oldestDate: null, skipped: 0 };
  }

  const oldestTxDate = transactions.at(-1)?.date;
  if (!oldestTxDate) {
    return { created: 0, oldestDate: null, skipped: 0 };
  }

  const dailyTotals = new Map<string, number>();
  for (const tx of transactions) {
    dailyTotals.set(tx.date, (dailyTotals.get(tx.date) ?? 0) + tx.amount);
  }

  const dates = getDateRange(new Date(oldestTxDate), new Date());
  const historicalBalances = calculateHistoricalBalances(
    currentBalance,
    dailyTotals,
    dates
  );

  const existingDates = new Set(
    await getSnapshotDatesForAccount(plaidAccountId)
  );
  const snapshotsToInsert = historicalBalances.filter(
    (snap) => !existingDates.has(snap.date)
  );
  const skipped = historicalBalances.length - snapshotsToInsert.length;

  const todayStr = getTodayDateOnly();
  const created = await insertBalanceSnapshots(
    snapshotsToInsert.map((snap) => ({
      availableBalance: snap.date === todayStr ? availableBalance : null,
      creditLimit,
      currentBalance: snap.balance,
      plaidAccountId,
      snapshotDate: snap.date,
      snapshotSource: snap.date === todayStr ? "webhook" : "backfill",
    }))
  );

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

export async function dispatchSnapshotWorkflowStep(
  _userId: string
): Promise<void> {
  "use step";

  await Promise.resolve();
}

// ── Onboarding-phase steps ─────────────────────────────────────────
// Wrap Plaid REST calls + mutations in steps so each has retry + replay.

export async function exchangePublicTokenStep(
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  "use step";

  const { access_token, item_id } = await exchangePublicToken(publicToken);
  return { accessToken: access_token, itemId: item_id };
}

export async function fetchItemForOnboardingStep(accessToken: string) {
  "use step";

  return await fetchItemAndAccounts(accessToken);
}

export interface DuplicateCheckInput {
  userId: string;
  institutionId: string | null;
  accounts: AccountBase[];
}

export async function duplicateCheckStep(input: DuplicateCheckInput) {
  "use step";

  return await checkForDuplicateAccounts(
    input.userId,
    input.institutionId,
    input.accounts.map((a) => ({
      mask: a.mask ?? null,
      name: a.name || a.official_name || "Account",
      persistentAccountId: a.persistent_account_id ?? null,
      type: a.type,
    }))
  );
}

/** Best-effort cleanup of a Plaid item. Swallows failures (non-critical). */
export async function removeItemStep(accessToken: string): Promise<void> {
  "use step";

  try {
    await removeItem(accessToken);
  } catch {
    // Cleanup failure is non-critical; the Plaid item becomes a dangling record
    // but onboarding flow must not throw on this path.
  }
}

export interface PersistOnboardingItemInput {
  accessToken: string;
  itemId: string;
  item: {
    available_products?: string[] | null;
    billed_products?: string[] | null;
    institution_id?: string | null;
    webhook?: string | null;
  };
  userId: string;
}

export async function persistOnboardingItemStep(
  input: PersistOnboardingItemInput
): Promise<void> {
  "use step";

  await persistOnboardingItem(input);
}

export async function triggerPlaidSyncStep(accessToken: string): Promise<void> {
  "use step";

  await triggerPlaidSync(accessToken);
}

/**
 * Update-mode: fetch the latest accounts list from Plaid and persist any new
 * ones onto the existing Item. Uses `onConflictDoNothing` so already-connected
 * accounts stay untouched.
 */
export async function persistNewAccountsForItemStep(
  accessToken: string,
  plaidItemId: string
): Promise<void> {
  "use step";

  const accounts = await fetchAccounts(accessToken);
  await syncNewAccountsForItem(plaidItemId, accounts);
}

/**
 * Reauth: drops `bank_connection.error` + `pendingDisconnectAt`, resolves any
 * open user alerts for this Item. Called after the user finishes Plaid Link
 * in reauth mode.
 */
export async function clearItemErrorStep(
  plaidItemId: string,
  userId: string
): Promise<void> {
  "use step";

  await clearItemError(plaidItemId, userId);
}
