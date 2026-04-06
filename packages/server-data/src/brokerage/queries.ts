import { db } from "@cobalt-web/db";
import { brokerageAccounts } from "@cobalt-web/db/schema/brokerage";
import { eq, and } from "drizzle-orm";

/**
 * Find a brokerage account by accountId with user ownership check.
 * Returns null if not found or doesn't belong to user.
 */
export async function findBrokerageAccountById(
  accountId: string,
  userId: string
): Promise<{
  accountId: string;
  accountName: string | null;
  institutionName: string | null;
  plaidAccountId: string;
  userId: string;
} | null> {
  const [account] = await db
    .select({
      accountId: brokerageAccounts.id,
      accountName: brokerageAccounts.name,
      institutionName: brokerageAccounts.institutionName,
      plaidAccountId: brokerageAccounts.accountId,
      userId: brokerageAccounts.userId,
    })
    .from(brokerageAccounts)
    .where(
      and(
        eq(brokerageAccounts.accountId, accountId),
        eq(brokerageAccounts.userId, userId)
      )
    )
    .limit(1);

  return account ?? null;
}
