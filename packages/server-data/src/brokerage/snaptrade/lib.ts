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
