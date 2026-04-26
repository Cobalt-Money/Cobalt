import { db } from "@cobalt-web/db";
import { investmentActivity } from "@cobalt-web/db/schema/accounts/investment-activity";
import { desc, eq } from "drizzle-orm";

/** Get the most recent activity sync timestamp for an account. */
export async function getLastActivitySyncDate(
  accountId: string
): Promise<Date | null> {
  try {
    const lastActivity = await db
      .select({ updatedAt: investmentActivity.updatedAt })
      .from(investmentActivity)
      .where(eq(investmentActivity.accountId, accountId))
      .orderBy(desc(investmentActivity.updatedAt))
      .limit(1);

    return lastActivity.at(0)?.updatedAt ?? null;
  } catch (error) {
    console.error(
      `Error getting last activity sync date for account ${accountId}:`,
      error
    );
    return null;
  }
}
