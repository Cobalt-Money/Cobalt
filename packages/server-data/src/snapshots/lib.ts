import type { BalanceSnapshot } from "./schemas.js";

/** Map a joined snapshot row (`snapshot` + `with: { account: {...} }`) to the HTTP DTO. */
export function toBalanceSnapshotDTO(row: {
  account: {
    externalId: string | null;
    institutionName: string | null;
    name: string;
    subtype: string | null;
    type: string;
  };
  available: string | null;
  createdAt: Date;
  creditLimit: string | null;
  current: string;
  id: string;
  snapshotDate: string;
}): BalanceSnapshot {
  const { account } = row;
  return {
    accountName: account.name,
    accountSubtype: account.subtype,
    accountType: account.type,
    availableBalance: row.available === null ? null : Number(row.available),
    createdAt: row.createdAt.toISOString(),
    creditLimit: row.creditLimit === null ? null : Number(row.creditLimit),
    currentBalance: Number(row.current),
    id: row.id,
    institutionName: account.institutionName,
    plaidAccountId: account.externalId,
    snapshotDate: row.snapshotDate,
  };
}
