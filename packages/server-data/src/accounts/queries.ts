import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { financialAccount } from "@cobalt-web/db/schema/accounts/financial-account";
import { institution } from "@cobalt-web/db/schema/banking/items/institution";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, eq, isNotNull, or } from "drizzle-orm";

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
  const rows = await db
    .select({
      acct: {
        externalId: financialAccount.externalId,
        mask: financialAccount.mask,
        name: financialAccount.name,
        plaidConnectionId: financialAccount.plaidConnectionId,
        subtype: financialAccount.subtype,
        type: financialAccount.type,
      },
      balance: {
        available: balance.available,
        current: balance.current,
        isoCurrencyCode: balance.isoCurrencyCode,
        limit: balance.limit,
        unofficialCurrencyCode: balance.unofficialCurrencyCode,
        updatedAt: balance.updatedAt,
        userOverrideCreditLimit: balance.userOverrideCreditLimit,
      },
      conn: {
        billedProducts: plaidConnection.billedProducts,
        error: plaidConnection.error,
        institutionId: plaidConnection.institutionId,
        institutionName: plaidConnection.institutionName,
        newAccountsAvailable: plaidConnection.newAccountsAvailable,
        pendingDisconnectAt: plaidConnection.pendingDisconnectAt,
        plaidItemId: plaidConnection.plaidItemId,
      },
      inst: {
        logo: institution.logo,
        url: institution.url,
      },
    })
    .from(financialAccount)
    .innerJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .leftJoin(balance, eq(balance.accountId, financialAccount.id))
    .leftJoin(
      institution,
      eq(institution.plaidInstitutionId, plaidConnection.institutionId)
    )
    .where(
      and(
        eq(financialAccount.userId, userId),
        eq(financialAccount.source, "plaid")
      )
    );

  // Sibling-types per connection (for hasInvestmentAccounts).
  const connectionIds = [
    ...new Set(rows.map((r) => r.acct.plaidConnectionId).filter(Boolean)),
  ] as string[];
  const siblingsByConn = new Map<string, string[]>();
  if (connectionIds.length > 0) {
    const sibs = await db
      .select({
        connectionId: financialAccount.plaidConnectionId,
        type: financialAccount.type,
      })
      .from(financialAccount)
      .where(
        and(
          eq(financialAccount.source, "plaid"),
          isNotNull(financialAccount.plaidConnectionId)
        )
      );
    for (const s of sibs) {
      if (!s.connectionId) {
        continue;
      }
      const list = siblingsByConn.get(s.connectionId) ?? [];
      list.push(s.type);
      siblingsByConn.set(s.connectionId, list);
    }
  }

  return rows.map((r): BankAccountDTO => {
    const joined: BankAccountJoinedRow = {
      balance: r.balance,
      connection: {
        billedProducts: r.conn.billedProducts ?? null,
        error: r.conn.error,
        institution: r.inst,
        institutionId: r.conn.institutionId,
        institutionName: r.conn.institutionName,
        newAccountsAvailable: r.conn.newAccountsAvailable,
        pendingDisconnectAt: r.conn.pendingDisconnectAt,
        plaidItemId: r.conn.plaidItemId,
      },
      externalId: r.acct.externalId,
      mask: r.acct.mask,
      name: r.acct.name,
      siblingAccountTypes: r.acct.plaidConnectionId
        ? (siblingsByConn.get(r.acct.plaidConnectionId) ?? [])
        : [],
      subtype: r.acct.subtype,
      type: r.acct.type,
    };
    return toBankAccountDTO(joined);
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
  const items = await db
    .select()
    .from(plaidConnection)
    .where(eq(plaidConnection.userId, userId));

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
  const accounts = await db
    .select({
      createdAt: financialAccount.createdAt,
      externalId: financialAccount.externalId,
      id: financialAccount.id,
      mask: financialAccount.mask,
      name: financialAccount.name,
      officialName: financialAccount.officialName,
      plaidItemId: plaidConnection.plaidItemId,
      subtype: financialAccount.subtype,
      type: financialAccount.type,
      updatedAt: financialAccount.updatedAt,
      verificationStatus: financialAccount.verificationStatus,
    })
    .from(financialAccount)
    .innerJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .where(
      and(
        eq(financialAccount.source, "plaid"),
        eq(plaidConnection.plaidItemId, plaidItemId),
        eq(plaidConnection.userId, userId)
      )
    );

  return accounts.map((a) => ({
    createdAt: a.createdAt.toISOString(),
    id: a.id,
    mask: a.mask,
    name: a.name,
    officialName: a.officialName,
    plaidAccountId: a.externalId,
    plaidItemId: a.plaidItemId,
    subtype: a.subtype,
    type: a.type,
    updatedAt: a.updatedAt.toISOString(),
    verificationStatus: a.verificationStatus,
  }));
}

export async function getPlaidItemsWithAlerts(
  userId: string
): Promise<PlaidItemAlertDTO[]> {
  const items = await db
    .select({
      error: plaidConnection.error,
      institutionLogo: plaidConnection.institutionLogo,
      institutionName: plaidConnection.institutionName,
      newAccountsAvailable: plaidConnection.newAccountsAvailable,
      pendingDisconnectAt: plaidConnection.pendingDisconnectAt,
      plaidItemId: plaidConnection.plaidItemId,
    })
    .from(plaidConnection)
    .where(
      and(
        eq(plaidConnection.userId, userId),
        or(
          isNotNull(plaidConnection.error),
          isNotNull(plaidConnection.pendingDisconnectAt)
        )
      )
    );

  return items.map((item) => ({
    institutionLogo: item.institutionLogo ?? null,
    institutionName: item.institutionName ?? "Unknown Bank",
    needsReauth: item.error !== null,
    newAccountsAvailable: item.newAccountsAvailable ?? false,
    pendingDisconnectAt: item.pendingDisconnectAt?.toISOString() ?? null,
    plaidItemId: item.plaidItemId,
  }));
}
