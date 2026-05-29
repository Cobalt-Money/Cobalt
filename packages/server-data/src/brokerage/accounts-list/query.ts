import { db } from "@cobalt-web/db";

import type { EnhancedBrokerageAccount } from "../_shared/schema.js";
import type { BrokerageAccountListItem } from "./schema.js";

/**
 * All brokerage-shaped accounts for a user — SnapTrade-connected accounts and
 * Plaid investment accounts — keyed on `financialAccount.externalId`.
 * Institution name is COALESCEd from `plaidConnection` for Plaid rows.
 */
export async function getBrokerageAccounts(userId: string): Promise<EnhancedBrokerageAccount[]> {
  const accounts = await db.query.financialAccount.findMany({
    columns: {
      createdAt: true,
      externalId: true,
      id: true,
      institutionName: true,
      name: true,
      status: true,
      subtype: true,
      type: true,
    },
    orderBy: { createdAt: "asc" },
    where: {
      OR: [
        { source: { eq: "snaptrade" } },
        { source: { eq: "plaid" }, type: { eq: "investment" } },
        { source: { eq: "manual" }, type: { eq: "investment" } },
      ],
      userId: { eq: userId },
    },
    with: {
      balance: {
        columns: {
          buyingPower: true,
          currency: true,
          current: true,
          id: true,
          lastSyncAt: true,
          updatedAt: true,
        },
      },
      plaidConnection: {
        columns: { institutionName: true },
      },
      snaptradeAuthorization: {
        columns: { authorizationId: true, isDisabled: true },
      },
    },
  });

  if (accounts.length === 0) {
    return [];
  }

  return accounts.map((account): EnhancedBrokerageAccount => {
    const b = account.balance;
    return {
      accountDetails: null,
      accountStatus: account.status ?? "",
      accountType: account.subtype ?? account.type ?? "",
      balanceData: null,
      balances: b
        ? [
            {
              buyingPower: b.buyingPower,
              cash: b.current,
              currencyCode: b.currency ?? "USD",
              currencyName: "US Dollar",
              id: b.id,
              lastSync: (b.lastSyncAt ?? b.updatedAt).toISOString(),
            },
          ]
        : [],
      cashRestrictions: null,
      createdDate: account.createdAt.toISOString(),
      id: account.externalId ?? account.id,
      institutionName: account.institutionName ?? account.plaidConnection?.institutionName ?? "",
      name: account.name ?? "",
      needsReauth: account.snaptradeAuthorization?.isDisabled ?? false,
      snaptradeAuthorizationId: account.snaptradeAuthorization?.authorizationId ?? null,
      userId,
    };
  });
}

/**
 * Slim down a full enhanced account to the list-item shape. Lives next to the
 * query that produces enhanced accounts.
 */
export function toBrokerageAccountListItem(
  account: EnhancedBrokerageAccount,
): BrokerageAccountListItem {
  return {
    accountDetails: account.accountDetails,
    accountStatus: account.accountStatus,
    accountType: account.accountType,
    balances: account.balances,
    id: account.id,
    institutionName: account.institutionName,
    name: account.name,
    needsReauth: account.needsReauth,
    snaptradeAuthorizationId: account.snaptradeAuthorizationId,
    source: "snaptrade",
  };
}
