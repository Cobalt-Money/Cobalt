import { db } from "@cobalt-web/db";
import { brokerageActivities } from "@cobalt-web/db/schema/brokerage";
import { desc, eq } from "drizzle-orm";

/** Get the most recent activity sync timestamp for an account. */
export async function getLastActivitySyncDate(
  accountId: string
): Promise<Date | null> {
  try {
    const lastActivity = await db
      .select({ lastSync: brokerageActivities.lastSync })
      .from(brokerageActivities)
      .where(eq(brokerageActivities.accountId, accountId))
      .orderBy(desc(brokerageActivities.lastSync))
      .limit(1);

    return lastActivity.at(0)?.lastSync ?? null;
  } catch (error) {
    console.error(
      `Error getting last activity sync date for account ${accountId}:`,
      error
    );
    return null;
  }
}
