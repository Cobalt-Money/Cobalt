import { brokerageInstitutionBranding } from "../../logos/brokerage-institution-branding";

export type AccountCategory = "banking" | "brokerage" | "credit" | "crypto";

export interface AccountCardViewModel {
  id: string;
  /** Bank (Plaid) vs SnapTrade brokerage — drives reconnect/disconnect APIs. */
  kind: "bank" | "brokerage";
  institution: string;
  /** Institution website URL (Brandfetch / Logo.dev), same as transactions. */
  institutionUrl: string | null;
  /** Plaid CDN logo from `institution` or `bank_connection`, when present. */
  institutionLogo: string | null;
  /** Extra direct logo URLs (e.g. SnapTrade Passiv fallbacks) after `institutionLogo`. */
  institutionLogosExtra?: readonly string[] | null;
  accountTypeLabel: string;
  description: string;
  mask: string;
  category: AccountCategory;
  /** Plaid — `DELETE /api/accounts/bank/:id` uses `plaidAccountId`. */
  plaidAccountId: string | null;
  /** Plaid — `POST /api/plaid/link-token/update` for reconnect. */
  plaidItemId: string | null;
  /** SnapTrade — `POST /api/snaptrade/generateConnectionPortal` reconnect. */
  snaptradeAuthorizationId: string | null;
  /** Unix ms — latest sync time when available. */
  lastSyncedAt: number | null;
}

function titleCaseWords(s: string): string {
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function categoryFromPlaidType(type: string): AccountCategory {
  if (type === "credit") {
    return "credit";
  }
  if (type === "investment") {
    return "brokerage";
  }
  return "banking";
}

function syncMsFromBalance(
  balance: { updatedAt?: number | null } | null | undefined
): number | null {
  return balance?.updatedAt ?? null;
}

function maskDigits(mask: string | null | undefined, fallback: string): string {
  const raw = (mask ?? fallback).replaceAll(/\D/g, "");
  const last4 = raw.slice(-4);
  return last4.length >= 4 ? last4 : last4.padStart(4, "0");
}

/** Shape returned by `queries.accounts.bankAccounts()` (financialAccount with plaidConnection→institution + balance). */
export interface BankAccountRowWithRelations {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  externalId: string | null;
  type: string;
  subtype: string | null;
  plaidConnection?: {
    plaidItemId?: string | null;
    institutionLogo?: string | null;
    institutionName?: string | null;
    institution?: {
      logo?: string | null;
      name?: string | null;
      url?: string | null;
    } | null;
  } | null;
  updatedAt?: number | null;
  balance?: {
    updatedAt?: number | null;
  } | null;
}

/** Shape returned by `queries.accounts.brokerageAccounts()` (financialAccount source='snaptrade' with balance + snaptradeAuthorization). */
export interface BrokerageRowWithRelations {
  id: string;
  externalId: string | null;
  accountNumber: string | null;
  institutionName: string | null;
  subtype: string | null;
  type: string;
  name: string | null;
  portfolioGroup: string | null;
  snaptradeAuthorization?: {
    authorizationId?: string | null;
    brokerage?: string | null;
    brokerageSlug?: string | null;
    name?: string | null;
    meta?: unknown | null;
  } | null;
  balance?: {
    updatedAt?: number | null;
  } | null;
}

function institutionFieldsFromBankConnection(
  conn: BankAccountRowWithRelations["plaidConnection"]
): {
  institution: string;
  institutionLogo: string | null;
  institutionUrl: string | null;
} {
  const inst = conn?.institution;
  return {
    institution: inst?.name?.trim() ?? conn?.institutionName?.trim() ?? "Bank",
    institutionLogo:
      inst?.logo?.trim() ?? conn?.institutionLogo?.trim() ?? null,
    institutionUrl: inst?.url?.trim() ?? null,
  };
}

export function bankAccountRowToCard(
  row: BankAccountRowWithRelations
): AccountCardViewModel {
  const { institution, institutionLogo, institutionUrl } =
    institutionFieldsFromBankConnection(row.plaidConnection);
  const lastSyncedAt = syncMsFromBalance(row.balance) ?? row.updatedAt ?? null;
  const { type } = row;
  const category = categoryFromPlaidType(type);
  const subtypeLabel = row.subtype
    ? titleCaseWords(row.subtype.replaceAll("_", " "))
    : titleCaseWords(type);
  const description = row.officialName?.trim() || row.name;

  return {
    accountTypeLabel: subtypeLabel,
    category,
    description,
    id: row.id,
    institution,
    institutionLogo,
    institutionUrl,
    kind: "bank",
    lastSyncedAt,
    mask: maskDigits(row.mask, row.externalId ?? ""),
    plaidAccountId: row.externalId,
    plaidItemId: row.plaidConnection?.plaidItemId ?? null,
    snaptradeAuthorizationId: null,
  };
}

export function brokerageRowToCard(
  row: BrokerageRowWithRelations
): AccountCardViewModel {
  const institution = row.institutionName?.trim() ?? "Brokerage";
  const { institutionLogo, institutionLogosExtra, institutionUrl } =
    brokerageInstitutionBranding(row);
  const accountTypeRaw = row.subtype ?? row.type ?? null;
  const typeLabel = accountTypeRaw
    ? titleCaseWords(accountTypeRaw.replaceAll("_", " "))
    : "Brokerage";
  const snapAuth = row.snaptradeAuthorization?.authorizationId?.trim() ?? null;
  const lastSyncedAt = syncMsFromBalance(row.balance);

  return {
    accountTypeLabel: typeLabel,
    category: "brokerage",
    description: row.name?.trim() ?? row.portfolioGroup ?? "Investment account",
    id: row.id,
    institution,
    institutionLogo,
    institutionLogosExtra:
      institutionLogosExtra.length > 0 ? institutionLogosExtra : null,
    institutionUrl,
    kind: "brokerage",
    lastSyncedAt,
    mask: maskDigits(row.accountNumber, row.externalId ?? ""),
    plaidAccountId: null,
    plaidItemId: null,
    snaptradeAuthorizationId: snapAuth,
  };
}

export function mergeAndSortAccountCards(
  bankRows: readonly BankAccountRowWithRelations[],
  brokerageRows: readonly BrokerageRowWithRelations[]
): AccountCardViewModel[] {
  const bankCards = bankRows.map(bankAccountRowToCard);
  const broCards = brokerageRows.map(brokerageRowToCard);
  return [...bankCards, ...broCards].toSorted((a, b) =>
    a.institution.localeCompare(b.institution)
  );
}
