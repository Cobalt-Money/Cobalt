import { db } from "@cobalt-web/db";

import { toDateString } from "../_shared/lib.js";
import type { PortfolioSnapshotItem, PortfolioSnapshotsQuery } from "./schema.js";

/**
 * Inline ownership in WHERE — snapshot.userId scopes to user, account filter
 * (snaptrade OR plaid-investment OR manual-investment) scopes to brokerage shape.
 * Non-matching accountId returns empty list — equivalent to 404 for our threat model.
 */
export async function getPortfolioSnapshots(
  userId: string,
  params: PortfolioSnapshotsQuery,
): Promise<PortfolioSnapshotItem[]> {
  const { accountId, startDate: startDateParam, endDate: endDateParam } = params;

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const startDate = startDateParam ?? sixMonthsAgo.toISOString().split("T")[0] ?? "";
  const endDate = endDateParam ?? now.toISOString().split("T")[0] ?? "";

  const rows = await db.query.snapshot.findMany({
    columns: {
      accountId: true,
      current: true,
      id: true,
      snapshotDate: true,
    },
    orderBy: { snapshotDate: "asc" },
    where: {
      account: {
        OR: [
          { source: { eq: "snaptrade" } },
          { AND: [{ source: { eq: "plaid" } }, { type: { eq: "investment" } }] },
          { AND: [{ source: { eq: "manual" } }, { type: { eq: "investment" } }] },
        ],
      },
      snapshotDate: { gte: startDate, lte: endDate },
      userId: { eq: userId },
      ...(accountId && accountId !== "all-accounts" ? { accountId: { eq: accountId } } : {}),
    },
  });

  return rows
    .map((s) => {
      const dateStr = toDateString(s.snapshotDate);
      if (!dateStr) {
        return null;
      }
      return {
        accountId: s.accountId,
        id: s.id,
        snapshotDate: dateStr,
        value: Number.parseFloat(s.current ?? "0"),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}
