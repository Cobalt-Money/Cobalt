import { db } from "@cobalt-web/db";

import {
  isBankAccountListType,
  isCreditCardAccount,
  matchesPlaidAccountId,
  toBankAccountDTO,
  toBankAccountListItem,
} from "./lib.js";
import type {
  BankAccountDTO,
  BankAccountListItem,
  PlaidAccountForItemDTO,
  PlaidItemAlertDTO,
  PlaidItemDTO,
} from "./schemas.js";

// ── Core query ──────────────────────────────────────────────────────

/**
 * Fetch all accounts with institution data for a user.
 * Uses relational queries: bankAccount → connection → institution, plus balances.
 */
export async function getAllAccountsWithInstitutions(
  userId: string
): Promise<BankAccountDTO[]> {
  const rows = await db.query.bankAccount.findMany({
    where: {
      connection: {
        userId: { eq: userId },
      },
    },
    with: {
      balances: {
        limit: 1,
        orderBy: { updatedAt: "desc" },
      },
      connection: {
        with: {
          accounts: {
            columns: { type: true },
          },
          institution: true,
        },
      },
    },
  });

  return rows.map(toBankAccountDTO);
}

// ── Filtered queries ────────────────────────────────────────────────

/** Bank accounts only (excludes credit and investment types). */
export async function getBankAccounts(
  userId: string
): Promise<BankAccountListItem[]> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.filter(isBankAccountListType).map(toBankAccountListItem);
}

/** Credit cards only. */
export async function getCreditCards(
  userId: string
): Promise<BankAccountListItem[]> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.filter(isCreditCardAccount).map(toBankAccountListItem);
}

/** Single bank account by plaidAccountId (full detail). */
export async function getBankAccountById(
  userId: string,
  accountId: string
): Promise<BankAccountDTO | null> {
  const all = await getAllAccountsWithInstitutions(userId);
  return all.find(matchesPlaidAccountId(accountId)) ?? null;
}

// ── Plaid items ─────────────────────────────────────────────────────

/** All bank connections (Plaid items) for a user. */
export async function getUserPlaidItems(
  userId: string
): Promise<PlaidItemDTO[]> {
  const items = await db.query.bankConnection.findMany({
    where: { userId: { eq: userId } },
  });

  return items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  }));
}

/** All accounts belonging to a specific Plaid item, with ownership check. */
export async function getPlaidAccountsForItem(
  userId: string,
  plaidItemId: string
): Promise<PlaidAccountForItemDTO[]> {
  const accounts = await db.query.bankAccount.findMany({
    columns: {
      createdAt: true,
      id: true,
      mask: true,
      name: true,
      officialName: true,
      plaidAccountId: true,
      plaidItemId: true,
      subtype: true,
      type: true,
      updatedAt: true,
      verificationStatus: true,
    },
    where: {
      connection: {
        plaidItemId: { eq: plaidItemId },
        userId: { eq: userId },
      },
    },
  });

  return accounts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

/** Bank connections with errors or pending disconnects. */
export async function getPlaidItemsWithAlerts(
  userId: string
): Promise<PlaidItemAlertDTO[]> {
  const items = await db.query.bankConnection.findMany({
    columns: {
      error: true,
      institutionLogo: true,
      institutionName: true,
      newAccountsAvailable: true,
      pendingDisconnectAt: true,
      plaidItemId: true,
    },
    where: {
      RAW: (t, { sql: sqlOp }) =>
        sqlOp`(${t.error} IS NOT NULL OR ${t.pendingDisconnectAt} IS NOT NULL)`,
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
