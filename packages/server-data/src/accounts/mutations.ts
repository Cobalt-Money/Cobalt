import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { eq } from "drizzle-orm";

import { ApiError } from "../_shared/api-error.js";
import { upsertManualBalanceSnapshotsForUser } from "../snapshots/mutations.js";
import type { ManualAccountCreateBody } from "./schemas.js";

/**
 * Resolve the internal `financial_account.id` for a (user, Plaid externalId)
 * pair. Throws a neutral 404 if the row is missing OR not owned — never
 * distinguishes the two (anti-enumeration).
 */
async function getOwnedPlaidAccountInternalId(
  plaidAccountId: string,
  userId: string,
): Promise<string> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: plaidAccountId },
      source: { eq: "plaid" },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  return row.id;
}

/** Set the user-override credit limit on the balance row for a Plaid account. */
export async function setCreditLimitOverride(
  plaidAccountId: string,
  userId: string,
  creditLimit: number,
) {
  const internalId = await getOwnedPlaidAccountInternalId(plaidAccountId, userId);
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: String(creditLimit) })
    .where(eq(balance.accountId, internalId));
}

/** Clear the user-override credit limit (revert to Plaid's value). */
export async function clearCreditLimitOverride(plaidAccountId: string, userId: string) {
  const internalId = await getOwnedPlaidAccountInternalId(plaidAccountId, userId);
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: null })
    .where(eq(balance.accountId, internalId));
}

/**
 * Disconnect a single Plaid-linked account.
 *
 * Deletes only the matched `financial_account` row (cascading to balance /
 * transaction / snapshot). The owning `plaid_connection` is preserved so the
 * dedup baseline stays intact for re-link flows. If this was the last account
 * under the item, the `plaid_connection` is removed too and the caller is
 * given the access token so it can call Plaid's `/item/remove` (stops billing
 * and webhook delivery).
 */
export async function disconnectBankConnection(userId: string, accountId: string) {
  // Single inline filter on userId — no leak of "exists but unowned".
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: accountId },
      source: { eq: "plaid" },
      userId: { eq: userId },
    },
    with: {
      plaidConnection: {
        columns: {
          id: true,
          institutionName: true,
          plaidAccessToken: true,
          plaidItemId: true,
          userId: true,
        },
      },
    },
  });

  if (!row || !row.plaidConnection) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }

  const conn = row.plaidConnection;

  if (!conn.plaidItemId || !conn.plaidAccessToken) {
    throw new ApiError(409, "plaid_connection_invalid", "Plaid connection is in an invalid state");
  }

  await db.delete(financialAccount).where(eq(financialAccount.id, row.id));

  const remaining = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: { plaidConnectionId: { eq: conn.id } },
  });

  const itemDrained = !remaining;
  if (itemDrained) {
    await db.delete(plaidConnection).where(eq(plaidConnection.id, conn.id));
  }

  return {
    accessToken: itemDrained ? conn.plaidAccessToken : null,
    message: `Successfully disconnected ${conn.institutionName ?? "bank account"}`,
    success: true,
  };
}

/**
 * Insert a manual financial account + its initial balance row, mirroring the
 * Zero `m.accounts.createAccount` mutator so the OAuth / SDK path and the
 * web-session path produce identical rows. Also seeds today's snapshot so the
 * new account shows up in net-worth views immediately (Plaid/SnapTrade get
 * this through their sync workflows; manual creates need it inline).
 *
 * Returns the new account id.
 */
export async function createManualAccount(
  userId: string,
  body: ManualAccountCreateBody,
): Promise<{ id: string }> {
  const accountId = crypto.randomUUID();
  const trimmedLogo = body.logoDomain?.trim();
  await db.insert(financialAccount).values({
    id: accountId,
    logoDomain: trimmedLogo && trimmedLogo.length > 0 ? trimmedLogo : null,
    name: body.name.trim(),
    source: "manual",
    subtype: body.subtype.trim(),
    type: body.type,
    userId,
  });
  await db.insert(balance).values({
    accountId,
    creditLimit:
      body.type === "credit" && body.creditLimit !== undefined ? body.creditLimit.toString() : null,
    currency: body.currency,
    current: body.currentBalance.toString(),
    userId,
  });
  await upsertManualBalanceSnapshotsForUser(userId, "manual-create");
  return { id: accountId };
}
