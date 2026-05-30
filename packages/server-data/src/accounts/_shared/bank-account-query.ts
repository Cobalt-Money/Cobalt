import { db } from "@cobalt-web/db";

import { numOrNull } from "./lib.js";
import type { BankAccountListItem, BankAccountResponse } from "./schema.js";

interface BankAccountWhere {
  /** Internal `financial_account.id` PK — source-agnostic single-account lookup. */
  id?: string;
}

/**
 * Fetch financial accounts joined with balance / Plaid connection / institution
 * for a user, plus a sibling-types lookup to compute `hasInvestmentAccounts`
 * (Plaid-only). Non-Plaid rows return with Plaid-derived fields nulled out and
 * `institutionName` falling back to `financial_account.institution_name`.
 *
 * `where.id` narrows to a single account by internal PK (any source).
 */
export async function getBankAccountsJoined(
  userId: string,
  where: BankAccountWhere = {},
): Promise<BankAccountResponse[]> {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      customName: true,
      id: true,
      institutionName: true,
      mask: true,
      name: true,
      plaidConnectionId: true,
      source: true,
      subtype: true,
      type: true,
    },
    where: {
      ...(where.id ? { id: { eq: where.id } } : {}),
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
  return rows.map((r): BankAccountResponse => {
    const conn = r.plaidConnection;
    const inst = conn?.institution;
    const b = r.balance;
    const siblingAccountTypes = r.plaidConnectionId
      ? (siblingsByConn.get(r.plaidConnectionId) ?? [])
      : [];
    const hasInvestmentAccounts = siblingAccountTypes.some((t) => t === "investment");
    return {
      available: numOrNull(b?.available ?? null),
      billedProducts: conn?.billedProducts ?? null,
      creditLimit: numOrNull(b?.creditLimit ?? null),
      currency: b?.currency ?? null,
      current: numOrNull(b?.current ?? null),
      error: conn?.error ?? null,
      hasInvestmentAccounts,
      id: r.id,
      institutionId: conn?.institutionId ?? null,
      institutionName: conn?.institutionName ?? r.institutionName ?? null,
      logo: inst?.logo ?? null,
      mask: r.mask,
      name: r.customName ?? r.name,
      newAccountsAvailable: conn?.newAccountsAvailable ?? false,
      pendingDisconnectAt: conn?.pendingDisconnectAt?.toISOString() ?? null,
      plaidItemId: conn?.plaidItemId ?? null,
      source: r.source,
      subtype: r.subtype,
      type: r.type,
      updatedAt: b?.updatedAt?.toISOString() ?? null,
      url: inst?.url ?? null,
      userOverrideCreditLimit: numOrNull(b?.userOverrideCreditLimit ?? null),
    };
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
    id: account.id,
    institutionName: account.institutionName,
    logo: account.logo,
    mask: account.mask,
    name: account.name,
    needsReauth,
    newAccountsAvailable,
    pendingDisconnectAt: account.pendingDisconnectAt,
    plaidItemId: account.plaidItemId,
    source: account.source,
    subtype: account.subtype,
    type: account.type,
    updatedAt: account.updatedAt,
    userOverrideCreditLimit: account.userOverrideCreditLimit,
  };
}
