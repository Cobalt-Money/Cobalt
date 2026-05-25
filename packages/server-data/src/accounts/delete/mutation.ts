import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { eq } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";

/**
 * Delete an account by its internal `financial_account.id` (the id exposed in
 * the public API), regardless of source. Manual accounts are removed outright;
 * Plaid accounts mirror `disconnectBankAccount` — drop the local row and, when
 * the owning item is drained, return the access token so the caller can hit
 * Plaid's `/item/remove` to stop billing and webhooks.
 */
export async function deleteAccountById(userId: string, accountId: string) {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true, source: true },
    where: {
      id: { eq: accountId },
      userId: { eq: userId },
    },
    with: {
      plaidConnection: {
        columns: {
          id: true,
          institutionName: true,
          plaidAccessToken: true,
          plaidItemId: true,
        },
      },
    },
  });

  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }

  if (row.source === "manual") {
    await db.delete(financialAccount).where(eq(financialAccount.id, row.id));
    return { accessToken: null, message: "Account deleted", success: true as const };
  }

  const conn = row.plaidConnection;
  if (!conn?.plaidItemId || !conn.plaidAccessToken) {
    // Non-Plaid provider (e.g. SnapTrade) or malformed Plaid row.
    throw new ApiError(409, "account_unsupported", "Account cannot be deleted via this endpoint");
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
    message: `Disconnected ${conn.institutionName ?? "account"}`,
    success: true as const,
  };
}
