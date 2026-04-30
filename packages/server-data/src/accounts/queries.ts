import { db } from "@cobalt-web/db";

import {
  isBankAccountListType,
  isCreditCardAccount,
  matchesPlaidAccountId,
  toBankAccountDTO,
  toBankAccountListItem,
} from "./lib.js";
import type { BankAccountJoinedRow } from "./lib.js";
import type {
  BankAccountDTO,
  BankAccountListItem,
  PlaidAccountForItemDTO,
  PlaidItemAlertDTO,
  PlaidItemDTO,
} from "./schemas.js";

// ── Core query ──────────────────────────────────────────────────────

/**
 * Fetch all Plaid-connected accounts with institution data for a user.
 * Joins financial_account ⨝ plaid_connection ⨝ balance ⨝ institution, plus
 * a sibling-types lookup to compute `hasInvestmentAccounts`.
 */
export async function getAllAccountsWithInstitutions(
  userId: string
): Promise<BankAccountDTO[]> {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      externalId: true,
      mask: true,
      name: true,
      plaidConnectionId: true,
      subtype: true,
      type: true,
    },
    where: {
      plaidConnectionId: { isNotNull: true },
      source: { eq: "plaid" },
      userId: { eq: userId },
    },
    with: {
      balance: {
        columns: {
          available: true,
          creditLimit: true,
          currency: true,
          current: true,
          updatedAt: true,
          userOverrideCreditLimit: true,
        },
      },
      plaidConnection: {
        columns: {
          billedProducts: true,
          error: true,
          institutionId: true,
          institutionName: true,
          newAccountsAvailable: true,
          pendingDisconnectAt: true,
          plaidItemId: true,
        },
        with: {
          institution: {
            columns: { logo: true, url: true },
          },
        },
      },
    },
  });

  // Sibling-types per connection (for hasInvestmentAccounts).
  const connectionIds = [
    ...new Set(rows.map((r) => r.plaidConnectionId).filter(Boolean)),
  ] as string[];
  const siblingsByConn = new Map<string, string[]>();
  if (connectionIds.length > 0) {
    const sibs = await db.query.financialAccount.findMany({
      columns: { plaidConnectionId: true, type: true },
      where: {
        plaidConnectionId: { isNotNull: true },
        source: { eq: "plaid" },
      },
    });
    for (const s of sibs) {
      if (!s.plaidConnectionId) {
        continue;
      }
      const list = siblingsByConn.get(s.plaidConnectionId) ?? [];
      list.push(s.type);
      siblingsByConn.set(s.plaidConnectionId, list);
    }
  }

  return rows.flatMap((r): BankAccountDTO[] => {
    const conn = r.plaidConnection;
    if (!conn) {
      return [];
    }
    const joined: BankAccountJoinedRow = {
      balance: r.balance,
      connection: {
        billedProducts: conn.billedProducts ?? null,
        error: conn.error,
        institution: conn.institution
          ? { logo: conn.institution.logo, url: conn.institution.url }
          : { logo: null, url: null },
        institutionId: conn.institutionId,
        institutionName: conn.institutionName,
        newAccountsAvailable: conn.newAccountsAvailable,
        pendingDisconnectAt: conn.pendingDisconnectAt,
        plaidItemId: conn.plaidItemId,
      },
      externalId: r.externalId,
      mask: r.mask,
      name: r.name,
      siblingAccountTypes: r.plaidConnectionId
        ? (siblingsByConn.get(r.plaidConnectionId) ?? [])
        : [],
      subtype: r.subtype,
      type: r.type,
    };
    return [toBankAccountDTO(joined)];
  });
}

// ── Filtered queries ────────────────────────────────────────────────

export async function getBankAccounts(
  userId: string
): Promise<BankAccountListItem[]> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.filter(isBankAccountListType).map(toBankAccountListItem);
}

export async function getCreditCards(
  userId: string
): Promise<BankAccountListItem[]> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.filter(isCreditCardAccount).map(toBankAccountListItem);
}

export async function getBankAccountById(
  userId: string,
  accountId: string
): Promise<BankAccountDTO | null> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.find(matchesPlaidAccountId(accountId)) ?? null;
}

// ── Plaid items ─────────────────────────────────────────────────────

export async function getUserPlaidItems(
  userId: string
): Promise<PlaidItemDTO[]> {
  const items = await db.query.plaidConnection.findMany({
    where: { userId: { eq: userId } },
  });

  return items.map((item) => ({
    availableProducts: item.availableProducts ?? null,
    billedProducts: item.billedProducts ?? null,
    createdAt: item.createdAt.toISOString(),
    error: item.error ?? null,
    id: item.id,
    institutionId: item.institutionId,
    institutionLogo: item.institutionLogo,
    institutionName: item.institutionName,
    newAccountsAvailable: item.newAccountsAvailable,
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    plaidItemId: item.plaidItemId,
    updatedAt: item.updatedAt.toISOString(),
    userId: item.userId,
  }));
}

export async function getPlaidAccountsForItem(
  userId: string,
  plaidItemId: string
): Promise<PlaidAccountForItemDTO[]> {
  const accounts = await db.query.financialAccount.findMany({
    columns: {
      createdAt: true,
      externalId: true,
      id: true,
      mask: true,
      name: true,
      officialName: true,
      subtype: true,
      type: true,
      updatedAt: true,
    },
    where: {
      plaidConnection: {
        plaidItemId: { eq: plaidItemId },
        userId: { eq: userId },
      },
      source: { eq: "plaid" },
    },
    with: {
      plaidConnection: {
        columns: { plaidItemId: true },
      },
    },
  });

  return accounts.flatMap((a) => {
    const conn = a.plaidConnection;
    if (!conn) {
      return [];
    }
    return [
      {
        createdAt: a.createdAt.toISOString(),
        id: a.id,
        mask: a.mask,
        name: a.name,
        officialName: a.officialName,
        plaidAccountId: a.externalId,
        plaidItemId: conn.plaidItemId,
        subtype: a.subtype,
        type: a.type,
        updatedAt: a.updatedAt.toISOString(),
      },
    ];
  });
}

export async function getPlaidItemsWithAlerts(
  userId: string
): Promise<PlaidItemAlertDTO[]> {
  const items = await db.query.plaidConnection.findMany({
    columns: {
      error: true,
      institutionLogo: true,
      institutionName: true,
      newAccountsAvailable: true,
      pendingDisconnectAt: true,
      plaidItemId: true,
    },
    where: {
      OR: [
        { error: { isNotNull: true } },
        { pendingDisconnectAt: { isNotNull: true } },
      ],
      userId: { eq: userId },
    },
  });

  return items.map((item) => ({
    institutionLogo: item.institutionLogo ?? null,
    institutionName: item.institutionName ?? "Unknown Bank",
    needsReauth: item.error !== null,
    newAccountsAvailable: item.newAccountsAvailable ?? false,
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    plaidItemId: item.plaidItemId,
  }));
}
