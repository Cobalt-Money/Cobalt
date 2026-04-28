import type { AccountBase } from "plaid";

/**
 * Curried mapper: Plaid account → `financial_account` insert row.
 * Caller supplies the resolved plaidConnection.id (uuid) + the connection's
 * userId. We tag every Plaid-sourced account with `source='plaid'` and store
 * the Plaid account_id as `externalId`.
 */
export const financialAccountInsertFromPlaid =
  (plaidConnectionId: string, userId: string) => (account: AccountBase) => ({
    externalId: account.account_id,
    mask: account.mask ?? null,
    name: account.name || account.official_name || "Account",
    officialName: account.official_name ?? null,
    persistentAccountId: account.persistent_account_id ?? null,
    plaidConnectionId,
    source: "plaid" as const,
    subtype: account.subtype ?? null,
    type: account.type,
    userId,
  });

/**
 * Pure shape for `balance` upsert from a Plaid account payload. Caller resolves
 * the new financial_account.id (uuid) before calling — Plaid's account_id is
 * looked up via (source='plaid', external_id).
 */
export const balanceRowFromPlaidAccount = (
  account: AccountBase,
  accountId: string,
  userId: string
) => ({
  accountId,
  available:
    account.balances.available !== null &&
    account.balances.available !== undefined
      ? String(account.balances.available)
      : null,
  creditLimit:
    account.balances.limit !== null && account.balances.limit !== undefined
      ? String(account.balances.limit)
      : null,
  currency: account.balances.iso_currency_code ?? null,
  current: String(account.balances.current ?? 0),
  userId,
});

/** Incoming Plaid account payload we want to dedup against existing rows. */
export interface DuplicateCheckCandidate {
  mask: string | null;
  name: string;
  persistentAccountId: string | null;
  type: string;
}

/** Row used when comparing a new Plaid account to existing DB accounts. */
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

export const isDuplicateAccountError = (
  error: unknown
): error is DuplicateAccountError =>
  error instanceof DuplicateAccountError ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "DUPLICATE_ACCOUNT");
