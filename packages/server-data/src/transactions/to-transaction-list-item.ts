import { normalizeDateForTransactionList } from "./lib.js";
import type { TransactionListItem } from "./schemas.js";

export interface TransactionListItemAccountSlice {
  name: string;
  plaidAccountId: string;
  type: string;
}

export type TransactionListItemInstitutionSlice = {
  logo: string | null;
  name: string | null;
  url: string | null;
} | null;

/** Transaction row slice for {@link toTransactionListItem} (Drizzle or Zero). */
export interface TransactionRowInput {
  amount: number;
  authorizedDate: string | Date | number | null | undefined;
  counterparties: TransactionListItem["counterparties"];
  date: string | Date | number;
  id: string;
  location: TransactionListItem["location"];
  logoUrl: string | null | undefined;
  merchantName: string | null | undefined;
  name: string;
  pending: boolean | null | undefined;
  personalFinanceCategory: TransactionListItem["personalFinanceCategory"];
  userOverrideCategory: TransactionListItem["userOverrideCategory"];
  userOverrideDate: string | Date | number | null | undefined;
  userOverrideName: string | null | undefined;
  website: string | null | undefined;
}

/**
 * Maps joined banking rows to the transaction list DTO (REST + Zero).
 * `date` / `authorizedDate` / `userOverrideDate` may be Drizzle date strings or Zero epoch ms.
 */
export function toTransactionListItem(input: {
  account: TransactionListItemAccountSlice;
  institution: TransactionListItemInstitutionSlice;
  transaction: TransactionRowInput;
}): TransactionListItem {
  const { account, institution: inst, transaction: row } = input;

  const normalizedDate = normalizeDateForTransactionList(row.date) ?? "";
  const normalizedOverrideDate = normalizeDateForTransactionList(
    row.userOverrideDate
  );

  return {
    accountName: account.name,
    accountType: account.type,
    amount: row.amount,
    authorizedDate: normalizeDateForTransactionList(row.authorizedDate),
    counterparties: row.counterparties,
    date: normalizedOverrideDate ?? normalizedDate,
    id: row.id,
    institutionLogo: inst?.logo ?? null,
    institutionName: inst?.name ?? null,
    institutionUrl: inst?.url ?? null,
    location: row.location,
    logoUrl: row.logoUrl ?? null,
    merchantName: row.merchantName ?? null,
    name: row.name,
    pending: row.pending ?? false,
    personalFinanceCategory:
      row.userOverrideCategory ?? row.personalFinanceCategory,
    plaidAccountId: account.plaidAccountId,
    userOverrideCategory: row.userOverrideCategory,
    userOverrideDate: normalizedOverrideDate,
    userOverrideName: row.userOverrideName ?? null,
    website: row.website ?? null,
  };
}
