import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { eq } from "drizzle-orm";

/** Look up the owner of a Plaid account. */
export async function getAccountOwner(plaidAccountId: string) {
  const row = await db.query.financialAccount.findFirst({
    columns: { externalId: true, userId: true },
    where: {
      externalId: { eq: plaidAccountId },
      source: { eq: "plaid" },
    },
  });

  if (!row?.externalId) {
    return null;
  }
  return { plaidAccountId: row.externalId, userId: row.userId };
}

/** Set the user-override credit limit on the balance row for a Plaid account. */
export async function setCreditLimitOverride(plaidAccountId: string, creditLimit: number) {
  const acct = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: plaidAccountId },
      source: { eq: "plaid" },
    },
  });
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
  const acct = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: plaidAccountId },
      source: { eq: "plaid" },
    },
  });
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
export async function disconnectBankConnection(userId: string, accountId: string) {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: accountId },
      source: { eq: "plaid" },
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
    return { accessToken: null, message: "Account not found", success: false };
  }

  const conn = row.plaidConnection;

  if (conn.userId !== userId) {
    return { accessToken: null, message: "Unauthorized", success: false };
  }

  if (!conn.plaidItemId || !conn.plaidAccessToken) {
    return {
      accessToken: null,
      message: "Invalid account data",
      success: false,
    };
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
