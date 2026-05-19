import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import {
  exchangePublicToken,
  fetchAccounts,
  fetchItemAndAccounts,
  removeItem,
  triggerPlaidSync,
} from "@cobalt-web/server-data/providers/plaid/link/actions";
import { financialAccountInsertFromPlaid } from "@cobalt-web/server-data/providers/plaid/link/lib";
import {
  applyItemWebhookState,
  clearItemError,
  persistOnboardingItem,
  syncNewAccountsForItem,
  upsertBalanceForPlaidAccount,
} from "@cobalt-web/server-data/providers/plaid/link/mutations";
import {
  checkForDuplicateAccounts,
  getBankConnectionByItemId,
} from "@cobalt-web/server-data/providers/plaid/link/queries";
import { upsertBankBalanceSnapshotsForUser } from "@cobalt-web/server-data/snapshots/mutations";
import { syncTransactionsPage } from "@cobalt-web/server-data/providers/plaid/transactions/actions";
import {
  applyPendingOverrides,
  persistTransactions,
  removeTransactionsByIds,
  setTransactionsCursor,
  syncRecurringForItem,
} from "@cobalt-web/server-data/providers/plaid/transactions/mutations";
import { getUserOverrides } from "@cobalt-web/server-data/providers/plaid/transactions/queries";
import type { UserOverrides } from "@cobalt-web/server-data/providers/plaid/transactions/queries";
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

export async function emitOnboardingProgressStep(event: Omit<PlaidOnboardingProgress, "at">) {
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
    typeof (error.response.data as { error_code: unknown }).error_code === "string"
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
    throw new FatalError(`ITEM webhook missing item_id: ${params.webhook_code}`);
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

async function resolvePlaidConnection(
  plaidItemId: string,
): Promise<{ id: string; userId: string }> {
  const [conn] = await db
    .select({ id: plaidConnection.id, userId: plaidConnection.userId })
    .from(plaidConnection)
    .where(eq(plaidConnection.plaidItemId, plaidItemId))
    .limit(1);
  if (!conn) {
    throw new Error(`plaid_connection not found for item ${plaidItemId}`);
  }
  return conn;
}

export async function syncAccountsAndBalancesStep(accessToken: string, itemId: string) {
  "use step";

  try {
    const accounts = await fetchAccounts(accessToken);
    const conn = await resolvePlaidConnection(itemId);
    const toInsert = financialAccountInsertFromPlaid(conn.id, conn.userId);

    await Promise.allSettled(
      accounts.map(async (account) => {
        await db
          .insert(financialAccount)
          .values(toInsert(account))
          .onConflictDoUpdate({
            set: {
              persistentAccountId: sql`coalesce(${financialAccount.persistentAccountId}, excluded.persistent_account_id)`,
              updatedAt: new Date(),
            },
            target: [financialAccount.source, financialAccount.externalId],
            targetWhere: sql`external_id IS NOT NULL`,
          });

        await upsertBalanceForPlaidAccount(account);

        return { accountId: account.account_id, success: true };
      }),
    );

    return { accounts, accountsCount: accounts.length };
  } catch (error) {
    if (isPlaidRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }
    throw error;
  }
}

export async function reconcileOrphanAccountsStep(accessToken: string, itemId: string) {
  "use step";

  try {
    const conn = await db
      .select({ id: plaidConnection.id, userId: plaidConnection.userId })
      .from(plaidConnection)
      .where(eq(plaidConnection.plaidItemId, itemId))
      .limit(1);

    const item = conn.at(0);
    if (!item) {
      return { migrated: 0, reconciled: 0 };
    }

    const plaidAccountsList = await fetchAccounts(accessToken);
    const plaidAccountIds = new Set(plaidAccountsList.map((a) => a.account_id));
    const dbAccounts = await db
      .select({
        externalId: financialAccount.externalId,
        id: financialAccount.id,
        mask: financialAccount.mask,
        name: financialAccount.name,
        persistentAccountId: financialAccount.persistentAccountId,
        subtype: financialAccount.subtype,
        type: financialAccount.type,
      })
      .from(financialAccount)
      .where(
        and(eq(financialAccount.source, "plaid"), eq(financialAccount.plaidConnectionId, item.id)),
      );

    const orphanAccounts = dbAccounts.filter(
      (a) => a.externalId !== null && !plaidAccountIds.has(a.externalId),
    );

    if (orphanAccounts.length === 0) {
      return { migrated: 0, reconciled: 0 };
    }

    let migrated = 0;

    for (const orphan of orphanAccounts) {
      const newAccount = findMatchingNewAccount(
        {
          externalId: orphan.externalId ?? "",
          mask: orphan.mask,
          name: orphan.name,
          persistentAccountId: orphan.persistentAccountId,
          subtype: orphan.subtype,
          type: orphan.type,
        },
        plaidAccountsList,
      );

      if (newAccount) {
        // Resolve the new financial_account.id by external account_id.
        const [newRow] = await db
          .select({ id: financialAccount.id })
          .from(financialAccount)
          .where(
            and(
              eq(financialAccount.source, "plaid"),
              eq(financialAccount.externalId, newAccount.account_id),
            ),
          )
          .limit(1);

        if (newRow) {
          await migrateSnapshotsToNewAccount(orphan.id, newRow.id, item.userId);
          migrated += 1;
        }
      }

      await db.delete(financialAccount).where(eq(financialAccount.id, orphan.id));
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
    externalId: string;
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
  }[],
): { account_id: string } | null {
  if (orphan.persistentAccountId) {
    const byPersistentId = accounts.find(
      (a) => a.persistent_account_id === orphan.persistentAccountId,
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
  const sameSubtype = sameType.filter((a) => (a.subtype ?? null) === (orphan.subtype ?? null));
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

/**
 * Re-point snapshot rows from an orphan financial_account to the new one,
 * skipping any (account, date) pair that already exists on the new account
 * (the unique index would reject the row anyway).
 */
async function migrateSnapshotsToNewAccount(
  orphanId: string,
  newId: string,
  userId: string,
): Promise<void> {
  const orphanRows = await db
    .select({ snapshotDate: snapshot.snapshotDate })
    .from(snapshot)
    .where(and(eq(snapshot.userId, userId), eq(snapshot.accountId, orphanId)));

  const newRows = await db
    .select({ snapshotDate: snapshot.snapshotDate })
    .from(snapshot)
    .where(and(eq(snapshot.userId, userId), eq(snapshot.accountId, newId)));
  const newDates = new Set(newRows.map((r) => r.snapshotDate));

  for (const row of orphanRows) {
    const date = row.snapshotDate;
    await (newDates.has(date)
      ? db
          .delete(snapshot)
          .where(
            and(
              eq(snapshot.userId, userId),
              eq(snapshot.accountId, orphanId),
              eq(snapshot.snapshotDate, date),
            ),
          )
      : db
          .update(snapshot)
          .set({ accountId: newId })
          .where(
            and(
              eq(snapshot.userId, userId),
              eq(snapshot.accountId, orphanId),
              eq(snapshot.snapshotDate, date),
            ),
          ));
  }
}

export async function syncTransactionsStep(
  accessToken: string,
  itemId: string,
  cursor?: string | null,
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

    await Promise.allSettled(accounts.map((account) => upsertBalanceForPlaidAccount(account)));
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

/**
 * Seeds today's snapshot row for every Plaid account belonging to a user.
 * Called once at link / reauth / update-mode time so the chart has a starting
 * point. Cron handles every subsequent day. Idempotent — re-running just
 * refreshes today's row.
 */
export async function seedTodayPlaidSnapshotsStep(userId: string): Promise<void> {
  "use step";
  await upsertBankBalanceSnapshotsForUser(userId, "link");
}

export async function dispatchSnapshotWorkflowStep(_userId: string): Promise<void> {
  "use step";

  await Promise.resolve();
}

// ── Onboarding-phase steps ─────────────────────────────────────────
// Wrap Plaid REST calls + mutations in steps so each has retry + replay.

export async function exchangePublicTokenStep(
  publicToken: string,
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
    })),
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

export async function persistOnboardingItemStep(input: PersistOnboardingItemInput): Promise<void> {
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
  plaidItemId: string,
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
export async function clearItemErrorStep(plaidItemId: string, userId: string): Promise<void> {
  "use step";

  await clearItemError(plaidItemId, userId);
}
