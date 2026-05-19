import { db } from "@cobalt-web/db";

import { toBalanceSnapshotDTO } from "./lib.js";
import type { BalanceSnapshot, BalanceSnapshotQuery } from "./schemas.js";

/**
 * Get balance snapshots with enriched account metadata. Joins
 * `snapshot ⨝ financial_account` and scopes by `snapshot.userId`.
 *
 * `filters.accountId` is the provider's external id on `financial_account`.
 */
export async function getBalanceSnapshotsByUserId(
  userId: string,
  filters: BalanceSnapshotQuery,
): Promise<BalanceSnapshot[]> {
  const dateConstraint = {
    ...(filters.startDate ? { gte: filters.startDate } : {}),
    ...(filters.endDate ? { lte: filters.endDate } : {}),
  };
  const rows = await db.query.snapshot.findMany({
    orderBy: { snapshotDate: "asc" },
    where: {
      userId: { eq: userId },
      ...(Object.keys(dateConstraint).length > 0 && {
        snapshotDate: dateConstraint,
      }),
      ...(filters.accountId && {
        account: { externalId: { eq: filters.accountId } },
      }),
    },
    with: {
      account: {
        columns: {
          externalId: true,
          institutionName: true,
          name: true,
          subtype: true,
          type: true,
        },
      },
    },
  });

  return rows.map((row) => toBalanceSnapshotDTO(row));
}
