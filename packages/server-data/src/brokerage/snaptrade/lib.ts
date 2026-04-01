import type {
  BrokerageAccountDetail,
  BrokerageBalance,
} from "@cobalt-web/db/schema/brokerage";

import type { EnhancedBrokerageAccount } from "../plaid/lib.js";

export type BrokerageAccountListItem = Pick<
  EnhancedBrokerageAccount,
  | "accountDetails"
  | "accountStatus"
  | "accountType"
  | "balances"
  | "id"
  | "institutionName"
  | "name"
> & {
  plaidAccountId?: string;
  source?: "plaid" | "snaptrade";
};

export function toIso(d: Date | null | undefined): string {
  return d ? d.toISOString() : new Date().toISOString();
}

function hasDetailBalance(d: Pick<BrokerageAccountDetail, "id" | "balance">) {
  return Boolean(d.id) && d.balance !== null && d.balance !== undefined;
}

export function accountDetailsFromDetailRows(
  details: BrokerageAccountDetail[]
): EnhancedBrokerageAccount["accountDetails"] {
  let last: EnhancedBrokerageAccount["accountDetails"] = null;
  for (const d of details) {
    if (!hasDetailBalance(d)) {
      continue;
    }
    last = {
      balance: typeof d.balance === "number" ? d.balance : null,
      id: d.id,
      lastSync: d.lastSync ? toIso(d.lastSync) : toIso(new Date()),
    };
  }
  return last;
}

export function balanceLineFromBalance(b: BrokerageBalance) {
  return {
    buyingPower: b.buyingPower ?? 0,
    cash: b.cash ?? 0,
    currencyCode: b.currencyCode ?? "USD",
    currencyName: b.currencyName ?? "US Dollar",
    id: b.id,
    lastSync: b.lastSync ? toIso(b.lastSync) : toIso(new Date()),
  };
}

export function toBrokerageAccountListItem(
  account: EnhancedBrokerageAccount
): BrokerageAccountListItem {
  return {
    accountDetails: account.accountDetails,
    accountStatus: account.accountStatus,
    accountType: account.accountType,
    balances: account.balances,
    id: account.id,
    institutionName: account.institutionName,
    name: account.name,
    source: "snaptrade",
  };
}
