import { db } from "@cobalt-web/db";
import { bankBalance, bankConnection } from "@cobalt-web/db/schema/banking";
import { eq } from "drizzle-orm";

/** Look up the owner of a Plaid account. */
export async function getAccountOwner(plaidAccountId: string) {
  const row = await db.query.bankAccount.findFirst({
    columns: { plaidAccountId: true },
    where: { plaidAccountId: { eq: plaidAccountId } },
    with: {
      connection: {
        columns: { userId: true },
      },
    },
  });

  if (!row) {
    return null;
  }
  return { plaidAccountId: row.plaidAccountId, userId: row.connection.userId };
}

/** Set the user-override credit limit on bankBalance. */
export async function setCreditLimitOverride(
  plaidAccountId: string,
  creditLimit: number
) {
  await db
    .update(bankBalance)
    .set({ userOverrideCreditLimit: creditLimit })
    .where(eq(bankBalance.plaidAccountId, plaidAccountId));
}

/** Clear the user-override credit limit (revert to Plaid's value). */
export async function clearCreditLimitOverride(plaidAccountId: string) {
  await db
    .update(bankBalance)
    .set({ userOverrideCreditLimit: null })
    .where(eq(bankBalance.plaidAccountId, plaidAccountId));
}

/**
 * Disconnect a bank account (DB-only — Plaid token revocation is handled by the caller).
 * Deletes the bankConnection row; cascading deletes remove accounts and balances.
 */
export async function disconnectBankConnection(
  userId: string,
  accountId: string
) {
  const row = await db.query.bankAccount.findFirst({
    columns: { plaidItemId: true },
    where: { plaidAccountId: { eq: accountId } },
    with: {
      connection: {
        columns: {
          institutionName: true,
          plaidAccessToken: true,
          plaidItemId: true,
          userId: true,
        },
      },
    },
  });

  if (!row) {
    return { accessToken: null, message: "Account not found", success: false };
  }

  const { connection } = row;

  if (connection.userId !== userId) {
    return { accessToken: null, message: "Unauthorized", success: false };
  }

  if (!connection.plaidItemId || !connection.plaidAccessToken) {
    return {
      accessToken: null,
      message: "Invalid account data",
      success: false,
    };
  }

  await db
    .delete(bankConnection)
    .where(eq(bankConnection.plaidItemId, connection.plaidItemId));

  return {
    accessToken: connection.plaidAccessToken,
    message: `Successfully disconnected ${connection.institutionName ?? "bank account"}`,
    success: true,
  };
}
