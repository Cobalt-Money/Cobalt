import { db } from "@cobalt-web/db";

import { toBalanceSnapshotDTO } from "./lib.js";
import type { BalanceSnapshot, BalanceSnapshotQuery } from "./schemas.js";

/**
 * Get balance snapshots with enriched account metadata.
 * Relational: snapshot → account → connection (user scoping on connection.userId).
 */
export async function getBalanceSnapshotsByUserId(
  userId: string,
  filters: BalanceSnapshotQuery
): Promise<BalanceSnapshot[]> {
  const whereParts = [
    { account: { connection: { userId: { eq: userId } } } },
  ] as const;

  const withFilters = [
    ...whereParts,
    ...(filters.accountId
      ? [{ plaidAccountId: { eq: filters.accountId } } as const]
      : []),
    ...(filters.startDate
      ? [{ snapshotDate: { gte: filters.startDate } } as const]
      : []),
    ...(filters.endDate
      ? [{ snapshotDate: { lte: filters.endDate } } as const]
      : []),
  ];

  const rows = await db.query.bankBalanceSnapshot.findMany({
    orderBy: { snapshotDate: "asc" },
    where: { AND: withFilters },
    with: {
      account: {
        with: {
          connection: true,
        },
      },
    },
  });

  return rows.flatMap((row) =>
    row.account === null
      ? []
      : [toBalanceSnapshotDTO({ ...row, account: row.account })]
  );
}
