import { db } from "@cobalt-web/db";
import { brokerageAccounts } from "@cobalt-web/db/schema/brokerage";
import { and, eq } from "drizzle-orm";

/** Resolve our internal DB row id for a SnapTrade account (scoped to user). */
export async function getBrokerageAccountDbId(
  snaptradeAccountId: string,
  userId: string
): Promise<string | null> {
  const account = await db
    .select({ id: brokerageAccounts.id })
    .from(brokerageAccounts)
    .where(
      and(
        eq(brokerageAccounts.accountId, snaptradeAccountId),
        eq(brokerageAccounts.userId, userId)
      )
    )
    .limit(1);

  return account.at(0)?.id ?? null;
}
