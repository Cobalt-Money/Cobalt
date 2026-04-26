import type { BankAccountDTO, BankAccountListItem } from "./schemas.js";

/** Joined row shape used by `toBankAccountDTO`. */
export interface BankAccountJoinedRow {
  /** Sibling account types under the same plaid_connection — feeds `hasInvestmentAccounts`. */
  siblingAccountTypes: string[];
  balance: {
    available: string | null;
    current: string | null;
    isoCurrencyCode: string | null;
    limit: string | null;
    unofficialCurrencyCode: string | null;
    updatedAt: Date | null;
    userOverrideCreditLimit: string | null;
  } | null;
  connection: {
    billedProducts: string[] | null;
    error: unknown;
    institution: {
      logo: string | null;
      url: string | null;
    } | null;
    institutionId: string | null;
    institutionName: string | null;
    newAccountsAvailable: boolean;
    pendingDisconnectAt: Date | null;
    plaidItemId: string;
  };
  externalId: string | null;
  mask: string | null;
  name: string;
  subtype: string | null;
  type: string;
}

export type { BankAccountDTO, BankAccountListItem };

// ── Predicates (pure; easy to unit-test) ────────────────────────────

export function isBankAccountListType(
  account: Pick<BankAccountDTO, "type">
): boolean {
  return account.type !== "credit" && account.type !== "investment";
}

export function isCreditCardAccount(
  account: Pick<BankAccountDTO, "type">
): boolean {
  return account.type === "credit";
}

export const matchesPlaidAccountId =
  (plaidAccountId: string) => (account: BankAccountDTO) =>
    account.plaidAccountId === plaidAccountId;

const numOrNull = (v: string | null): number | null =>
  v === null ? null : Number(v);

function extractBalance(b: BankAccountJoinedRow["balance"]) {
  return {
    available: numOrNull(b?.available ?? null),
    current: numOrNull(b?.current ?? null),
    isoCurrencyCode: b?.isoCurrencyCode ?? null,
    limit: numOrNull(b?.limit ?? null),
    unofficialCurrencyCode: b?.unofficialCurrencyCode ?? null,
    updatedAt: b?.updatedAt?.toISOString() ?? null,
    userOverrideCreditLimit: numOrNull(b?.userOverrideCreditLimit ?? null),
  };
}

/** Convert a joined query row into the serialisable BankAccount DTO. */
export function toBankAccountDTO(row: BankAccountJoinedRow): BankAccountDTO {
  const { connection } = row;
  const inst = connection.institution;
  const balanceFields = extractBalance(row.balance);
  const hasInvestmentAccounts = row.siblingAccountTypes.some(
    (t) => t === "investment"
  );
  const currency =
    balanceFields.isoCurrencyCode ??
    balanceFields.unofficialCurrencyCode ??
    null;

  return {
    ...balanceFields,
    billedProducts: connection.billedProducts,
    currency,
    error: connection.error ?? null,
    hasInvestmentAccounts,
    institutionId: connection.institutionId ?? null,
    institutionName: connection.institutionName,
    logo: inst?.logo ?? null,
    mask: row.mask,
    name: row.name,
    newAccountsAvailable: connection.newAccountsAvailable,
    pendingDisconnectAt: connection.pendingDisconnectAt?.toISOString() ?? null,
    plaidAccountId: row.externalId,
    plaidItemId: connection.plaidItemId,
    subtype: row.subtype,
    type: row.type,
    url: inst?.url ?? null,
  };
}

/** Transform full BankAccountDTO to list item (removes unused fields). */
export function toBankAccountListItem(
  account: BankAccountDTO
): BankAccountListItem {
  const billedProducts = account.billedProducts ?? [];
  const hasInvestments = billedProducts.includes("investments");
  const hasLiabilities = billedProducts.includes("liabilities");
  const { hasInvestmentAccounts } = account;
  const canAddInvestments = !hasInvestments && hasInvestmentAccounts;
  const needsReauth = account.error !== null;
  const newAccountsAvailable = account.newAccountsAvailable ?? false;
  const { pendingDisconnectAt } = account;
  const creditLimit = account.userOverrideCreditLimit ?? account.limit ?? null;

  return {
    canAddInvestments,
    creditLimit,
    currency: account.currency,
    current: account.current,
    hasInvestments,
    hasLiabilities,
    institutionName: account.institutionName,
    isoCurrencyCode: account.isoCurrencyCode,
    limit: account.limit,
    logo: account.logo,
    mask: account.mask,
    name: account.name,
    needsReauth,
    newAccountsAvailable,
    pendingDisconnectAt,
    plaidAccountId: account.plaidAccountId,
    plaidItemId: account.plaidItemId,
    subtype: account.subtype,
    type: account.type,
    unofficialCurrencyCode: account.unofficialCurrencyCode,
    updatedAt: account.updatedAt,
    userOverrideCreditLimit: account.userOverrideCreditLimit,
  };
}
