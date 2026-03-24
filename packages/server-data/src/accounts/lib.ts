import type {
  BankAccountSelect,
  BankBalanceSelect,
} from "@cobalt-web/db/schema/banking";

import type { BankAccountDTO, BankAccountListItem } from "./schemas.js";

/** Relational row shape from bankAccount.findMany with connection + balances. */
export interface BankAccountRelationalRow {
  balances: BankBalanceSelect[];
  connection: {
    accounts: { type: string }[];
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
  };
  mask: BankAccountSelect["mask"];
  name: BankAccountSelect["name"];
  plaidAccountId: BankAccountSelect["plaidAccountId"];
  plaidItemId: BankAccountSelect["plaidItemId"];
  subtype: BankAccountSelect["subtype"];
  type: BankAccountSelect["type"];
}

export type { BankAccountDTO, BankAccountListItem };

// ── Predicates (pure; easy to unit-test) ────────────────────────────

/** General “bank accounts” list: depository-style, not credit or investment products. */
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

/** Extract balance fields from the latest balance row (Drizzle column names). */
function extractBalance(balances: BankBalanceSelect[]) {
  const balance = balances[0] ?? null;
  return {
    available: balance?.available ?? null,
    current: balance?.current ?? null,
    isoCurrencyCode: balance?.isoCurrencyCode ?? null,
    limit: balance?.limit ?? null,
    unofficialCurrencyCode: balance?.unofficialCurrencyCode ?? null,
    updatedAt: balance?.updatedAt?.toISOString() ?? null,
    userOverrideCreditLimit: balance?.userOverrideCreditLimit ?? null,
  };
}

/** Convert a relational query row into the serialisable BankAccount DTO. */
export function toBankAccountDTO(
  row: BankAccountRelationalRow
): BankAccountDTO {
  const { connection } = row;
  const inst = connection.institution;
  const balanceFields = extractBalance(row.balances);
  const hasInvestmentAccounts = connection.accounts.some(
    (a) => a.type === "investment"
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
    plaidAccountId: row.plaidAccountId,
    plaidItemId: row.plaidItemId,
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
