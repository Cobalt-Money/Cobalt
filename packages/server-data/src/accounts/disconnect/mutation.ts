import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { eq } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";
import { disconnectBrokerageAccountByUserId } from "../../providers/snaptrade/disconnect.js";

/**
 * Source-agnostic disconnect. Loads the row by `financial_account.id`,
 * dispatches on `source`. Single entry point for `DELETE /api/accounts/:id`.
 *
 * Returns Plaid access token when the parent item drained so the route can
 * call `/item/remove` upstream; null for non-Plaid or non-draining cases.
 */
export async function disconnectAccount(
  userId: string,
  accountId: string,
): Promise<{ accessToken: string | null; message: string; success: boolean }> {
  const row = await db.query.financialAccount.findFirst({
    columns: { source: true },
    where: { id: { eq: accountId }, userId: { eq: userId } },
  });

  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }

  switch (row.source) {
    case "plaid": {
      return disconnectBankAccount(userId, accountId);
    }
    case "snaptrade": {
      const r = await disconnectBrokerageAccountByUserId(userId, accountId);
      return { accessToken: null, message: r.message, success: r.success };
    }
    case "manual": {
      const deleted = await db
        .delete(financialAccount)
        .where(eq(financialAccount.id, accountId))
        .returning({ name: financialAccount.name });
      return {
        accessToken: null,
        message: `Successfully disconnected ${deleted[0]?.name ?? "account"}`,
        success: true,
      };
    }
    default: {
      throw new ApiError(409, "account_source_unsupported", "Unsupported account source");
    }
  }
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
export async function disconnectBankAccount(userId: string, accountId: string) {
  // Single inline filter on userId — no leak of "exists but unowned".
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      id: { eq: accountId },
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
