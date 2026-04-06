import { db } from "@cobalt-web/db";
import { bankAccount, bankBalance } from "@cobalt-web/db/schema/banking";
import { inArray } from "drizzle-orm";

/**
 * Find all bank connection plaid_item_ids for a user.
 * Returns array of plaidItemId strings.
 */
export async function findBankConnectionIdsByUser(
  userId: string
): Promise<string[]> {
  const connections = await db.query.bankConnection.findMany({
    columns: { plaidItemId: true },
    where: { userId: { eq: userId } },
  });

  return connections.map((c) => c.plaidItemId);
}

/**
 * Find all bank account plaid_account_ids for given plaid_item_ids.
 * Returns array of plaidAccountId strings.
 */
export async function findBankAccountIdsByItemIds(
  plaidItemIds: string[]
): Promise<string[]> {
  if (plaidItemIds.length === 0) {
    return [];
  }

  const accounts = await db
    .select({
      plaidAccountId: bankAccount.plaidAccountId,
    })
    .from(bankAccount)
    .where(inArray(bankAccount.plaidItemId, plaidItemIds));

  return accounts.map((a) => a.plaidAccountId);
}

/**
 * Find all balances for given plaid_account_ids.
 * Returns rows ordered by plaidAccountId and updatedAt (ascending).
 * Caller should deduplicate to get latest per account.
 */
export function findBankBalancesByAccountIds(
  plaidAccountIds: string[]
): Promise<
  {
    available: number | null;
    current: number;
    limit: number | null;
    plaidAccountId: string;
    updatedAt: Date;
  }[]
> {
  if (plaidAccountIds.length === 0) {
    return Promise.resolve([]);
  }

  return db
    .select({
      available: bankBalance.available,
      current: bankBalance.current,
      limit: bankBalance.limit,
      plaidAccountId: bankBalance.plaidAccountId,
      updatedAt: bankBalance.updatedAt,
    })
    .from(bankBalance)
    .where(inArray(bankBalance.plaidAccountId, plaidAccountIds))
    .orderBy(bankBalance.plaidAccountId, bankBalance.updatedAt);
}
