import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalance,
  bankConnection,
} from "@cobalt-web/db/schema/banking";
import {
  ALERT_SOURCES,
  ALERT_STATUSES,
  userAlerts,
} from "@cobalt-web/db/schema/features";
import { and, eq, inArray } from "drizzle-orm";
import type { AccountBase } from "plaid";

/** Curried mapper: Plaid account → `bank_account` insert row (data-first config, data-last account). */
const bankAccountInsertFromPlaid =
  (plaidItemId: string) => (account: AccountBase) => ({
    mask: account.mask ?? null,
    name: account.name || account.official_name || "Account",
    officialName: account.official_name ?? null,
    plaidAccountId: account.account_id,
    plaidItemId,
    subtype: account.subtype ?? null,
    type: account.type,
    verificationStatus: account.verification_status ?? null,
  });

/** Pure shape for `bank_balance` upsert from a Plaid account payload. */
const balanceRowFromPlaidAccount = (account: AccountBase) => ({
  available: account.balances.available ?? null,
  current: account.balances.current ?? 0,
  isoCurrencyCode: account.balances.iso_currency_code ?? null,
  limit: account.balances.limit ?? null,
  plaidAccountId: account.account_id,
  unofficialCurrencyCode: account.balances.unofficial_currency_code ?? null,
});

/**
 * Get access token for a Plaid item with ownership check.
 * Throws if item not found or user doesn't own it.
 */
export async function getAccessTokenForItem(
  userId: string,
  plaidItemId: string
): Promise<string> {
  const item = await db.query.bankConnection.findFirst({
    columns: { plaidAccessToken: true },
    where: {
      AND: [{ plaidItemId: { eq: plaidItemId } }, { userId: { eq: userId } }],
    },
  });

  if (!item) {
    throw new Error("Item not found or access denied");
  }

  return item.plaidAccessToken;
}

/**
 * Persist Plaid item metadata to bankConnection.
 */
export async function persistItemMetadata(params: {
  accessToken: string;
  availableProducts: string[];
  billedProducts: string[];
  institutionId: string | null;
  institutionLogo: string | null;
  institutionName: string | null;
  itemId: string;
  userId: string;
  webhookUrl: string | null;
}): Promise<void> {
  await db.insert(bankConnection).values({
    availableProducts: params.availableProducts,
    billedProducts: params.billedProducts,
    institutionId: params.institutionId,
    institutionLogo: params.institutionLogo,
    institutionName: params.institutionName,
    plaidAccessToken: params.accessToken,
    plaidItemId: params.itemId,
    userId: params.userId,
    webhookUrl: params.webhookUrl,
  });
}

/** Upsert balance for a single Plaid account (Plaid accounts/get payload). */
export function upsertBankBalanceFromPlaidAccount(
  account: AccountBase
): Promise<void> {
  return syncBalanceForAccount(account);
}

/** Upsert balance for a single Plaid account. */
async function syncBalanceForAccount(account: AccountBase): Promise<void> {
  const existing = await db.query.bankBalance.findFirst({
    where: { plaidAccountId: { eq: account.account_id } },
  });

  const balanceData = balanceRowFromPlaidAccount(account);

  await (existing
    ? db
        .update(bankBalance)
        .set({ ...balanceData, updatedAt: new Date() })
        .where(eq(bankBalance.plaidAccountId, account.account_id))
    : db.insert(bankBalance).values(balanceData));
}

/**
 * Sync new accounts for an item: upsert accounts + balances, clear flag.
 */
export async function syncNewAccountsForItem(
  plaidItemId: string,
  accounts: AccountBase[]
): Promise<void> {
  if (accounts.length > 0) {
    const toInsert = bankAccountInsertFromPlaid(plaidItemId);
    await db
      .insert(bankAccount)
      .values(accounts.map(toInsert))
      .onConflictDoNothing({ target: bankAccount.plaidAccountId });

    await Promise.all(accounts.map(syncBalanceForAccount));
  }

  await db
    .update(bankConnection)
    .set({ newAccountsAvailable: false, updatedAt: new Date() })
    .where(eq(bankConnection.plaidItemId, plaidItemId));
}

/**
 * Insert a bank account row if missing (sync pipeline). Does not update metadata on conflict.
 */
export async function insertBankAccountIgnoreConflict(
  plaidItemId: string,
  account: AccountBase
): Promise<void> {
  await db
    .insert(bankAccount)
    .values(bankAccountInsertFromPlaid(plaidItemId)(account))
    .onConflictDoNothing({ target: bankAccount.plaidAccountId });
}

/**
 * Clear error state after re-authentication and resolve active alerts.
 */
export async function clearItemError(
  plaidItemId: string,
  userId: string
): Promise<void> {
  const item = await db.query.bankConnection.findFirst({
    columns: { plaidItemId: true },
    where: {
      AND: [{ plaidItemId: { eq: plaidItemId } }, { userId: { eq: userId } }],
    },
  });

  if (!item) {
    throw new Error("Item not found or access denied");
  }

  await db
    .update(bankConnection)
    .set({
      error: null,
      pendingDisconnectAt: null,
      updatedAt: new Date(),
    })
    .where(eq(bankConnection.plaidItemId, plaidItemId));

  await db
    .update(userAlerts)
    .set({ resolvedAt: new Date(), status: ALERT_STATUSES.RESOLVED })
    .where(
      and(
        eq(userAlerts.source, ALERT_SOURCES.PLAID),
        eq(userAlerts.sourceId, plaidItemId),
        inArray(userAlerts.status, [ALERT_STATUSES.UNREAD, ALERT_STATUSES.READ])
      )
    );
}
