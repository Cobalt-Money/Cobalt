import { db } from "@cobalt-web/db";

/** Get the most recent activity sync timestamp for an account. */
export async function getLastActivitySyncDate(
  accountId: string
): Promise<Date | null> {
  try {
    const lastActivity = await db.query.investmentActivity.findFirst({
      columns: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
      where: { accountId: { eq: accountId } },
    });
    return lastActivity?.updatedAt ?? null;
  } catch (error) {
    console.error(
      `Error getting last activity sync date for account ${accountId}:`,
      error
    );
    return null;
  }
}
