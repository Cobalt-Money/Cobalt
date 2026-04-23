import type { AccountBase } from "plaid";

/** Curried mapper: Plaid account → `bank_account` insert row (data-first config, data-last account). */
export const bankAccountInsertFromPlaid =
  (plaidItemId: string) => (account: AccountBase) => ({
    mask: account.mask ?? null,
    name: account.name || account.official_name || "Account",
    officialName: account.official_name ?? null,
    persistentAccountId: account.persistent_account_id ?? null,
    plaidAccountId: account.account_id,
    plaidItemId,
    subtype: account.subtype ?? null,
    type: account.type,
    verificationStatus: account.verification_status ?? null,
  });

/** Pure shape for `bank_balance` upsert from a Plaid account payload. */
export const balanceRowFromPlaidAccount = (account: AccountBase) => ({
  available: account.balances.available ?? null,
  current: account.balances.current ?? 0,
  isoCurrencyCode: account.balances.iso_currency_code ?? null,
  limit: account.balances.limit ?? null,
  plaidAccountId: account.account_id,
  unofficialCurrencyCode: account.balances.unofficial_currency_code ?? null,
});

/** Incoming Plaid account payload we want to dedup against existing rows. */
export interface DuplicateCheckCandidate {
  mask: string | null;
  name: string;
  persistentAccountId: string | null;
  type: string;
}

/** Row used when comparing a new Plaid account to existing DB accounts (duplicate check). */
export interface ExistingAccountDuplicateRow {
  createdAt: Date;
  mask: string | null;
  name: string;
  persistentAccountId: string | null;
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
