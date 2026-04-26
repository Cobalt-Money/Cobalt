import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { financialAccount } from "@cobalt-web/db/schema/accounts/financial-account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, eq } from "drizzle-orm";

/** Look up the owner of a Plaid account. */
export async function getAccountOwner(plaidAccountId: string) {
  const [row] = await db
    .select({
      externalId: financialAccount.externalId,
      userId: financialAccount.userId,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.externalId, plaidAccountId)
      )
    )
    .limit(1);

  if (!row?.externalId) {
    return null;
  }
  return { plaidAccountId: row.externalId, userId: row.userId };
}

/** Set the user-override credit limit on the balance row for a Plaid account. */
export async function setCreditLimitOverride(
  plaidAccountId: string,
  creditLimit: number
) {
  const [acct] = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.externalId, plaidAccountId)
      )
    )
    .limit(1);
  if (!acct) {
    return;
  }
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: String(creditLimit) })
    .where(eq(balance.accountId, acct.id));
}

/** Clear the user-override credit limit (revert to Plaid's value). */
export async function clearCreditLimitOverride(plaidAccountId: string) {
  const [acct] = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.externalId, plaidAccountId)
      )
    )
    .limit(1);
  if (!acct) {
    return;
  }
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: null })
    .where(eq(balance.accountId, acct.id));
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
export async function disconnectBankConnection(
  userId: string,
  accountId: string
) {
  const [row] = await db
    .select({
      financialAccountId: financialAccount.id,
      institutionName: plaidConnection.institutionName,
      ownerUserId: plaidConnection.userId,
      plaidAccessToken: plaidConnection.plaidAccessToken,
      plaidConnectionId: plaidConnection.id,
      plaidItemId: plaidConnection.plaidItemId,
    })
    .from(financialAccount)
    .innerJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.externalId, accountId)
      )
    )
    .limit(1);

  if (!row) {
    return { accessToken: null, message: "Account not found", success: false };
  }

  if (row.ownerUserId !== userId) {
    return { accessToken: null, message: "Unauthorized", success: false };
  }

  if (!row.plaidItemId || !row.plaidAccessToken) {
    return {
      accessToken: null,
      message: "Invalid account data",
      success: false,
    };
  }

  await db
    .delete(financialAccount)
    .where(eq(financialAccount.id, row.financialAccountId));

  const remaining = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(eq(financialAccount.plaidConnectionId, row.plaidConnectionId))
    .limit(1);

  const itemDrained = remaining.length === 0;
  if (itemDrained) {
    await db
      .delete(plaidConnection)
      .where(eq(plaidConnection.id, row.plaidConnectionId));
  }

  return {
    accessToken: itemDrained ? row.plaidAccessToken : null,
    message: `Successfully disconnected ${row.institutionName ?? "bank account"}`,
    success: true,
  };
}
