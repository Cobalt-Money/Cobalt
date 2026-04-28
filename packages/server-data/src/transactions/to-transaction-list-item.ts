import { normalizeDateForTransactionList } from "./lib.js";
import type { TransactionListItem } from "./schemas.js";

export interface TransactionListItemAccountSlice {
  name: string;
  plaidAccountId: string | null;
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
  category: string | null | undefined;
  categoryConfidence: string | null | undefined;
  categoryDetail: string | null | undefined;
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
  userOverrideLocation: TransactionListItem["location"];
  website: string | null | undefined;
}

function synthesizeLocation(
  row: TransactionRowInput
): TransactionListItem["location"] {
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
 * `name`, `category`, `date` are the source of truth — no override fallback needed.
 */
export function toTransactionListItem(input: {
  account: TransactionListItemAccountSlice;
  institution: TransactionListItemInstitutionSlice;
  transaction: TransactionRowInput;
}): TransactionListItem {
  const { account, institution: inst, transaction: row } = input;

  const normalizedDate = normalizeDateForTransactionList(row.date) ?? "";
  const synthesizedLocation = synthesizeLocation(row);

  return {
    accountName: account.name,
    accountType: account.type,
    amount: row.amount,
    authorizedDate: normalizeDateForTransactionList(row.authorizedDate),
    category: row.category ?? null,
    categoryConfidence: row.categoryConfidence ?? null,
    categoryDetail: row.categoryDetail ?? null,
    counterparties: row.counterparties,
    date: normalizedDate,
    id: row.id,
    institutionLogo: inst?.logo ?? null,
    institutionName: inst?.name ?? null,
    institutionUrl: inst?.url ?? null,
    location: row.userOverrideLocation ?? synthesizedLocation,
    lockedFields: row.lockedFields ?? [],
    logoUrl: row.logoUrl ?? null,
    merchantName: row.merchantName ?? null,
    name: row.name,
    notes: row.notes ?? null,
    pending: row.pending ?? false,
    plaidAccountId: account.plaidAccountId,
    userOverrideLocation: row.userOverrideLocation ?? null,
    website: row.website ?? null,
  };
}
