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

/** Row used when comparing a new Plaid account to existing DB accounts (duplicate check). */
export interface ExistingAccountDuplicateRow {
  createdAt: Date;
  mask: string | null;
  name: string;
  type: string;
}

/** Pure predicate: same account type and matching mask when both masks are present. */
export const matchesDuplicateAccountMask = (
  candidate: Pick<ExistingAccountDuplicateRow, "mask" | "type">,
  existing: ExistingAccountDuplicateRow
): boolean =>
  candidate.type === existing.type &&
  candidate.mask !== null &&
  existing.mask !== null &&
  candidate.mask === existing.mask;

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

/**
 * Custom error class for duplicate account detection.
 */
export class DuplicateAccountError extends Error {
  readonly code = "DUPLICATE_ACCOUNT" as const;
  readonly duplicateAccounts: { name: string; createdAt: Date }[];

  constructor(
    message: string,
    duplicateAccounts: { name: string; createdAt: Date }[]
  ) {
    super(message);
    this.name = "DuplicateAccountError";
    this.duplicateAccounts = duplicateAccounts;
  }
}

/** Type guard to check if an error is a DuplicateAccountError. */
export const isDuplicateAccountError = (
  error: unknown
): error is DuplicateAccountError =>
  error instanceof DuplicateAccountError ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "DUPLICATE_ACCOUNT");
