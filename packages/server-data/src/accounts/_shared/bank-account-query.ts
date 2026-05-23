import { db } from "@cobalt-web/db";

import { numOrNull } from "./lib.js";
import type { BankAccountListItem, BankAccountResponse } from "./schema.js";

interface BankAccountWhere {
  externalId?: string;
}

/**
 * Fetch Plaid-connected accounts joined with balance / connection / institution
 * for a user, plus a sibling-types lookup to compute `hasInvestmentAccounts`.
 * If `where.externalId` is provided, narrows to that single account so callers
 * don't fetch-all-then-find.
 */
export async function getBankAccountsJoined(
  userId: string,
  where: BankAccountWhere = {},
): Promise<BankAccountResponse[]> {
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
      ...(where.externalId ? { externalId: { eq: where.externalId } } : {}),
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

  // oxlint-disable-next-line eslint/complexity -- flat field projection from joined row, not branching logic
  return rows.flatMap((r): BankAccountResponse[] => {
    const conn = r.plaidConnection;
    if (!conn) {
      return [];
    }
    const inst = conn.institution;
    const b = r.balance;
    const siblingAccountTypes = r.plaidConnectionId
      ? (siblingsByConn.get(r.plaidConnectionId) ?? [])
      : [];
    const hasInvestmentAccounts = siblingAccountTypes.some((t) => t === "investment");
    const currency = b?.currency ?? null;
    return [
      {
        available: numOrNull(b?.available ?? null),
        billedProducts: conn.billedProducts ?? null,
        creditLimit: numOrNull(b?.creditLimit ?? null),
        currency,
        current: numOrNull(b?.current ?? null),
        error: conn.error ?? null,
        hasInvestmentAccounts,
        institutionId: conn.institutionId ?? null,
        institutionName: conn.institutionName,
        logo: inst?.logo ?? null,
        mask: r.mask,
        name: r.name,
        newAccountsAvailable: conn.newAccountsAvailable,
        pendingDisconnectAt: conn.pendingDisconnectAt?.toISOString() ?? null,
        plaidAccountId: r.externalId,
        plaidItemId: conn.plaidItemId,
        subtype: r.subtype,
        type: r.type,
        updatedAt: b?.updatedAt?.toISOString() ?? null,
        url: inst?.url ?? null,
        userOverrideCreditLimit: numOrNull(b?.userOverrideCreditLimit ?? null),
      },
    ];
  });
}

/** Transform full BankAccountResponse to list item (removes unused fields, adds computed flags). */
export function toBankAccountListItem(account: BankAccountResponse): BankAccountListItem {
  const billedProducts = account.billedProducts ?? [];
  const hasInvestments = billedProducts.includes("investments");
  const hasLiabilities = billedProducts.includes("liabilities");
  const { hasInvestmentAccounts } = account;
  const canAddInvestments = !hasInvestments && hasInvestmentAccounts;
  const needsReauth = account.error !== null;
  const newAccountsAvailable = account.newAccountsAvailable ?? false;
  const creditLimit = account.userOverrideCreditLimit ?? account.creditLimit ?? null;

  return {
    canAddInvestments,
    creditLimit,
    currency: account.currency,
    current: account.current,
    hasInvestments,
    hasLiabilities,
    institutionName: account.institutionName,
    logo: account.logo,
    mask: account.mask,
    name: account.name,
    needsReauth,
    newAccountsAvailable,
    pendingDisconnectAt: account.pendingDisconnectAt,
    plaidAccountId: account.plaidAccountId,
    plaidItemId: account.plaidItemId,
    subtype: account.subtype,
    type: account.type,
    updatedAt: account.updatedAt,
    userOverrideCreditLimit: account.userOverrideCreditLimit,
  };
}
