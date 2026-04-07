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
  /** SnapTrade — `POST /api/snaptrade/generate-connection-portal` reconnect. */
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

function latestBankSyncMsFromBalances(
  balances: { updatedAt?: number | null }[]
): number | null {
  let best: number | null = null;
  for (const b of balances) {
    const t = b.updatedAt ?? null;
    if (t !== null && (best === null || t > best)) {
      best = t;
    }
  }
  return best;
}

function maskDigits(mask: string | null | undefined, fallback: string): string {
  const raw = (mask ?? fallback).replaceAll(/\D/g, "");
  const last4 = raw.slice(-4);
  return last4.length >= 4 ? last4 : last4.padStart(4, "0");
}

/** Shape returned by `queries.accounts.bankAccounts()` (related connection + balances). */
export interface BankAccountRowWithRelations {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  plaidItemId: string;
  type: string;
  subtype: string | null;
  plaidAccountId: string;
  connection?: {
    institutionLogo?: string | null;
    institutionName?: string | null;
    institution?: {
      logo?: string | null;
      name?: string | null;
      url?: string | null;
    } | null;
  } | null;
  updatedAt?: number | null;
  balances?: {
    updatedAt?: number | null;
  }[];
}

/** Shape returned by `queries.accounts.brokerageAccounts()` (related balances). */
export interface BrokerageRowWithRelations {
  id: string;
  accountId: string;
  accountNumber: string | null;
  institutionName: string | null;
  accountType: string | null;
  name: string | null;
  portfolioGroup: string | null;
  /** SnapTrade account-level JSON; may mirror brokerage reference fields. */
  metaData?: unknown | null;
  brokerageAuthorization?: {
    authorizationId: string;
    /** SnapTrade brokerage id when not a UUID — sometimes usable like `brokerageSlug`. */
    brokerage?: string | null;
    brokerageSlug?: string | null;
    name?: string | null;
    meta?: unknown | null;
  } | null;
  balances?: {
    lastSync?: number | null;
    updatedAt?: number | null;
  }[];
}

function institutionFieldsFromBankConnection(
  conn: BankAccountRowWithRelations["connection"]
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

function latestBrokerageSyncMs(
  rows: {
    lastSync?: number | null;
    updatedAt?: number | null;
  }[]
): number | null {
  let best: number | null = null;
  for (const r of rows) {
    const t = r.lastSync ?? r.updatedAt ?? null;
    if (t !== null && (best === null || t > best)) {
      best = t;
    }
  }
  return best;
}

export function bankAccountRowToCard(
  row: BankAccountRowWithRelations
): AccountCardViewModel {
  const { institution, institutionLogo, institutionUrl } =
    institutionFieldsFromBankConnection(row.connection);
  const lastSyncedAt =
    latestBankSyncMsFromBalances(row.balances ?? []) ?? row.updatedAt ?? null;
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
    mask: maskDigits(row.mask, row.plaidAccountId),
    plaidAccountId: row.plaidAccountId,
    plaidItemId: row.plaidItemId,
    snaptradeAuthorizationId: null,
  };
}

export function brokerageRowToCard(
  row: BrokerageRowWithRelations
): AccountCardViewModel {
  const institution = row.institutionName?.trim() ?? "Brokerage";
  const { institutionLogo, institutionLogosExtra, institutionUrl } =
    brokerageInstitutionBranding(row);
  const typeLabel = row.accountType
    ? titleCaseWords(row.accountType.replaceAll("_", " "))
    : "Brokerage";
  const snapAuth = row.brokerageAuthorization?.authorizationId?.trim() ?? null;
  const lastSyncedAt = latestBrokerageSyncMs(row.balances ?? []);

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
    mask: maskDigits(row.accountNumber, row.accountId),
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
