import { db } from "@cobalt-web/db";

import { matchesDuplicateAccountMask, toBalanceSnapshotDTO } from "./lib.js";
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
  //fetching user snapshots from db
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
  // only returnign snapshots we need by mutating dto
  return rows.flatMap((row) =>
    row.account === null
      ? []
      : [toBalanceSnapshotDTO({ ...row, account: row.account })]
  );
}

/**
 * Check for duplicate accounts before linking.
 * Compares institution_id + mask + type to detect existing accounts.
 */
export async function checkForDuplicateAccounts(
  userId: string,
  institutionId: string | null,
  newAccounts: { mask: string | null; type: string; name: string }[]
): Promise<{
  isDuplicate: boolean;
  duplicateAccounts: { name: string; createdAt: Date }[];
}> {
  if (!institutionId) {
    return { duplicateAccounts: [], isDuplicate: false };
  }

  const connections = await db.query.bankConnection.findMany({
    where: {
      AND: [
        { userId: { eq: userId } },
        { institutionId: { eq: institutionId } },
      ],
    },
    with: {
      accounts: true,
    },
  });

  const existingAccounts = connections.flatMap((c) =>
    c.accounts.map((a) => ({
      createdAt: c.createdAt,
      mask: a.mask,
      name: a.name,
      type: a.type,
    }))
  );

  const duplicateAccounts = newAccounts.flatMap((newAccount) => {
    const match = existingAccounts.find((existing) =>
      matchesDuplicateAccountMask(newAccount, existing)
    );
    return match ? [{ createdAt: match.createdAt, name: match.name }] : [];
  });

  return {
    duplicateAccounts,
    isDuplicate: duplicateAccounts.length > 0,
  };
}
