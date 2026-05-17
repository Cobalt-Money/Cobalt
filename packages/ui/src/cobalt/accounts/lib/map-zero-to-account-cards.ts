import type { queries, Row } from "@cobalt-web/zero";

import { brokerageInstitutionBranding } from "../../logos/brokerage-institution-branding";

export type AccountCategory = "banking" | "savings" | "brokerage" | "credit" | "loan";

const SAVINGS_SUBTYPES = new Set(["savings", "cd", "money market", "money_market", "hsa"]);

export interface AccountCardViewModel {
  id: string;
  /** True when user has set `customName`; show reset affordance. */
  isCustomNamed: boolean;
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
  /** Plaid — `POST /api/plaid/linkToken/update` for reconnect. */
  plaidItemId: string | null;
  /** SnapTrade — `POST /api/snaptrade/generateConnectionPortal` reconnect. */
  snaptradeAuthorizationId: string | null;
  /** Unix ms — latest sync time when available. */
  lastSyncedAt: number | null;
  /** Underlying provider — `manual` accounts disconnect via Zero mutator instead of REST. */
  source: "plaid" | "snaptrade" | "manual";
  /** Raw subtype for callers that need to special-case (e.g. cash glyph for `subtype === "cash"`). */
  subtype: string | null;
}

function titleCaseWords(s: string): string {
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function categoryFromPlaidType(type: string, subtype: string | null): AccountCategory {
  if (type === "credit") {
    return "credit";
  }
  if (type === "investment" || type === "brokerage") {
    return "brokerage";
  }
  if (type === "loan") {
    return "loan";
  }
  if (subtype && SAVINGS_SUBTYPES.has(subtype.toLowerCase())) {
    return "savings";
  }
  return "banking";
}

function syncMsFromBalance(
  balance: { updatedAt?: number | null } | null | undefined,
): number | null {
  return balance?.updatedAt ?? null;
}

function maskDigits(mask: string | null | undefined, fallback: string): string {
  const raw = (mask ?? fallback).replaceAll(/\D/g, "");
  const last4 = raw.slice(-4);
  return last4.length >= 4 ? last4 : last4.padStart(4, "0");
}

/** Row from `queries.accounts.bankAccounts()` — financialAccount with plaidConnection→institution + balance. */
export type BankAccountRowWithRelations = Row<typeof queries.accounts.bankAccounts>;

/** Row from `queries.brokerage.accounts()` — financialAccount source='snaptrade' with balance + snaptradeAuthorization. */
export type BrokerageRowWithRelations = Row<typeof queries.brokerage.accounts>;

function institutionFieldsFromBankConnection(
  conn: BankAccountRowWithRelations["plaidConnection"],
): {
  institution: string;
  institutionLogo: string | null;
  institutionUrl: string | null;
} {
  const inst = conn?.institution;
  return {
    institution: inst?.name?.trim() ?? conn?.institutionName?.trim() ?? "Bank",
    institutionLogo: inst?.logo?.trim() ?? conn?.institutionLogo?.trim() ?? null,
    institutionUrl: inst?.url?.trim() ?? null,
  };
}

function pickSubtypeLabel(subtype: string | null, type: string): string {
  if (subtype) {
    return titleCaseWords(subtype.replaceAll("_", " "));
  }
  return titleCaseWords(type);
}

export function bankAccountRowToCard(row: BankAccountRowWithRelations): AccountCardViewModel {
  const isManual = row.source === "manual";
  const fromConn = institutionFieldsFromBankConnection(row.plaidConnection);
  const institution = isManual ? (row.institutionName?.trim() ?? row.name) : fromConn.institution;
  const institutionLogo = isManual ? null : fromConn.institutionLogo;
  const institutionUrl = isManual ? (row.logoDomain?.trim() ?? null) : fromConn.institutionUrl;
  const lastSyncedAt = syncMsFromBalance(row.balance) ?? row.updatedAt ?? null;
  const { type } = row;
  const category = categoryFromPlaidType(type, row.subtype);
  const subtypeLabel = pickSubtypeLabel(row.subtype, type);
  const customName = row.customName?.trim() || null;
  const description = customName ?? (row.officialName?.trim() || row.name);

  return {
    accountTypeLabel: subtypeLabel,
    category,
    description,
    id: row.id,
    institution,
    institutionLogo,
    institutionUrl,
    isCustomNamed: customName !== null,
    kind: "bank",
    lastSyncedAt,
    mask: maskDigits(row.mask, row.externalId ?? ""),
    plaidAccountId: row.externalId,
    plaidItemId: row.plaidConnection?.plaidItemId ?? null,
    snaptradeAuthorizationId: null,
    source: row.source,
    subtype: row.subtype,
  };
}

export function brokerageRowToCard(row: BrokerageRowWithRelations): AccountCardViewModel {
  const institution = row.institutionName?.trim() ?? "Brokerage";
  const { institutionLogo, institutionLogosExtra, institutionUrl } =
    brokerageInstitutionBranding(row);
  const accountTypeRaw = row.subtype ?? row.type ?? null;
  const typeLabel = accountTypeRaw
    ? titleCaseWords(accountTypeRaw.replaceAll("_", " "))
    : "Brokerage";
  const snapAuth = row.snaptradeAuthorization?.authorizationId?.trim() ?? null;
  const lastSyncedAt = syncMsFromBalance(row.balance);
  const customName = row.customName?.trim() || null;
  const description = customName ?? (row.name?.trim() || "Investment account");

  return {
    accountTypeLabel: typeLabel,
    category: "brokerage",
    description,
    id: row.id,
    institution,
    institutionLogo,
    institutionLogosExtra: institutionLogosExtra.length > 0 ? institutionLogosExtra : null,
    institutionUrl,
    isCustomNamed: customName !== null,
    kind: "brokerage",
    lastSyncedAt,
    mask: maskDigits(row.accountNumber, row.externalId ?? ""),
    plaidAccountId: null,
    plaidItemId: null,
    snaptradeAuthorizationId: snapAuth,
    source: "snaptrade",
    subtype: row.subtype,
  };
}

export function mergeAndSortAccountCards(
  bankRows: readonly BankAccountRowWithRelations[],
  brokerageRows: readonly BrokerageRowWithRelations[],
): AccountCardViewModel[] {
  const bankCards = bankRows.map(bankAccountRowToCard);
  const broCards = brokerageRows.map(brokerageRowToCard);
  return [...bankCards, ...broCards].toSorted((a, b) => a.institution.localeCompare(b.institution));
}
