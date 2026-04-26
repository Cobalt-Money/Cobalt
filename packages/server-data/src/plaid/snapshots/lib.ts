import type { BalanceSnapshot } from "./schemas.js";

/**
 * Joined row shape (snapshot ⨝ financial_account) for `toBalanceSnapshotDTO`.
 */
export interface BalanceSnapshotJoinedRow {
  account: {
    externalId: string | null;
    institutionName: string | null;
    name: string;
    subtype: string | null;
    type: string;
  };
  available: string | null;
  createdAt: Date;
  current: string;
  id: string;
  limit: string | null;
  snapshotDate: string;
}

/** Map a joined snapshot row to the HTTP DTO. */
export function toBalanceSnapshotDTO(
  row: BalanceSnapshotJoinedRow
): BalanceSnapshot {
  const { account } = row;
  return {
    accountName: account.name,
    accountSubtype: account.subtype,
    accountType: account.type,
    availableBalance: row.available === null ? null : Number(row.available),
    createdAt: row.createdAt.toISOString(),
    creditLimit: row.limit === null ? null : Number(row.limit),
    currentBalance: Number(row.current),
    id: row.id,
    institutionName: account.institutionName,
    plaidAccountId: account.externalId,
    snapshotDate: row.snapshotDate,
  };
}
