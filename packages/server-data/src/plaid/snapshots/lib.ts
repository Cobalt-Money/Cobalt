import type { BalanceSnapshot } from "./schemas.js";

/**
 * Minimal row shape for `toBalanceSnapshotDTO` (matches relational `with` load;
 * full `bankAccount` rows are assignable here).
 */
export interface BalanceSnapshotRelationalRow {
  account: {
    connection: { institutionName: string | null };
    name: string;
    subtype: string | null;
    type: string;
  };
  availableBalance: number | null;
  createdAt: Date;
  creditLimit: number | null;
  currentBalance: number;
  id: string;
  plaidAccountId: string;
  snapshotDate: string;
  snapshotSource: string;
}

/** Map a relational balance snapshot row to the HTTP DTO. */
export function toBalanceSnapshotDTO(
  row: BalanceSnapshotRelationalRow
): BalanceSnapshot {
  const { account } = row;
  const { connection } = account;

  return {
    accountName: account.name,
    accountSubtype: account.subtype,
    accountType: account.type,
    availableBalance: row.availableBalance,
    createdAt: row.createdAt.toISOString(),
    creditLimit: row.creditLimit,
    currentBalance: row.currentBalance,
    id: row.id,
    institutionName: connection.institutionName,
    plaidAccountId: row.plaidAccountId,
    snapshotDate: row.snapshotDate,
    snapshotSource: row.snapshotSource,
  };
}
