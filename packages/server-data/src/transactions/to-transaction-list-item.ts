import { normalizeDateForTransactionList } from "./lib.js";
import type { TransactionListItem } from "./schemas.js";

export interface TransactionListItemAccountSlice {
  name: string;
  plaidAccountId: string | null;
  type: string;
  subtype: string | null;
  /** Brandfetch domain for manual accounts (`financial_account.logo_domain`). */
  logoDomain: string | null;
}

export type TransactionListItemInstitutionSlice = {
  logo: string | null;
  name: string | null;
  url: string | null;
} | null;

/** Joined `category` slice (id + display fields + group). Null when row not yet backfilled. */
export type TransactionRowCategory = {
  groupName: string;
  groupSystemKey: string | null;
  iconKey: string;
  id: string;
  name: string;
  systemKey: string | null;
} | null;

/** Transaction row slice for {@link toTransactionListItem} (Drizzle or Zero). */
export interface TransactionRowInput {
  amount: number;
  authorizedDate: string | Date | number | null | undefined;
  source: "plaid" | "manual";
  category: TransactionRowCategory;
  counterparties: TransactionListItem["counterparties"];
  date: string | Date | number;
  id: string;
  address: string | null | undefined;
  city: string | null | undefined;
  region: string | null | undefined;
  postalCode: string | null | undefined;
  country: string | null | undefined;
  lat: number | null | undefined;
  lockedFields?: string[] | null;
  lon: number | null | undefined;
  storeNumber: string | null | undefined;
  logoUrl: string | null | undefined;
  merchantName: string | null | undefined;
  name: string;
  notes: TransactionListItem["notes"];
  pending: boolean | null | undefined;
  tagIds?: readonly string[] | null | undefined;
  website: string | null | undefined;
}

function synthesizeLocation(row: TransactionRowInput): TransactionListItem["location"] {
  const hasAny =
    row.address ||
    row.city ||
    row.region ||
    row.postalCode ||
    row.country ||
    row.storeNumber ||
    (row.lat !== null && row.lat !== undefined) ||
    (row.lon !== null && row.lon !== undefined);
  if (!hasAny) {
    return null;
  }
  return {
    address: row.address ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    postal_code: row.postalCode ?? null,
    region: row.region ?? null,
    store_number: row.storeNumber ?? null,
  };
}

/**
 * Maps joined banking rows to the transaction list DTO (REST + Zero).
 * `date` / `authorizedDate` may be Drizzle date strings or Zero epoch ms.
 * All editable fields (name, category, date, location, …) live directly on
 * the `transaction` row — user edits overwrite the column and `lockedFields`
 * gates further Plaid sync. History lives in `transaction_edit`.
 */
export function toTransactionListItem(input: {
  account: TransactionListItemAccountSlice;
  institution: TransactionListItemInstitutionSlice;
  transaction: TransactionRowInput;
}): TransactionListItem {
  const { account, institution: inst, transaction: row } = input;

  const normalizedDate = normalizeDateForTransactionList(row.date) ?? "";

  return {
    accountLogoDomain: account.logoDomain,
    accountName: account.name,
    accountSubtype: account.subtype,
    accountType: account.type,
    amount: row.amount,
    authorizedDate: normalizeDateForTransactionList(row.authorizedDate),
    category: row.category ?? null,
    counterparties: row.counterparties,
    date: normalizedDate,
    id: row.id,
    institutionLogo: inst?.logo ?? null,
    institutionName: inst?.name ?? null,
    institutionUrl: inst?.url ?? null,
    location: synthesizeLocation(row),
    lockedFields: row.lockedFields ?? [],
    logoUrl: row.logoUrl ?? null,
    merchantName: row.merchantName ?? null,
    name: row.name,
    notes: row.notes ?? null,
    pending: row.pending ?? false,
    plaidAccountId: account.plaidAccountId,
    source: row.source,
    tagIds: row.tagIds ? [...row.tagIds] : [],
    website: row.website ?? null,
  };
}
