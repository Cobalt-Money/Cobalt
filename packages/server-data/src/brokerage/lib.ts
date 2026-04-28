/** Pure date helper — extracts YYYY-MM-DD from a Date, ISO string, or date-only string. */
export const toDateString = (
  val: string | Date | null | undefined
): string | null => {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0] ?? null;
  }
  if (typeof val === "string" && val.includes("T")) {
    return val.split("T")[0] ?? null;
  }
  return val;
};

/** Pure timestamp helper — converts Date | string | null to ISO string or null. */
export const toISOString = (
  val: Date | string | null | undefined
): string | null => {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
};

// ── Wire DTOs (unified brokerage payload shapes) ────────────────────

export interface MergedBrokeragePosition {
  accountId: string;
  averagePurchasePrice: string | null;
  createdAt: string | null;
  currencyCode: string | null;
  currencyId: string | null;
  currencyName: string | null;
  exchangeCode: string | null;
  exchangeId: string | null;
  exchangeMicCode: string | null;
  exchangeName: string | null;
  figiCode: string | null;
  id: string;
  isQuotable: boolean;
  isTradable: boolean;
  lastSync: string | null;
  localId: string | null;
  openPnl: string | null;
  price: string | null;
  rawSymbol: string | null;
  securityTypeCode: string | null;
  securityTypeDescription: string | null;
  securityTypeId: string | null;
  snapTradeAccountId: string | null;
  symbol: string | null;
  symbolDescription: string | null;
  symbolId: string | null;
  units: string | null;
  updatedAt: string | null;
  userId: string;
}

export interface MergedBrokerageActivity {
  accountId: string;
  activityId: string | null;
  amount: string | null;
  createdAt: string | null;
  currencyCode: string | null;
  currencyId: string | null;
  currencyName: string | null;
  description: string | null;
  exchangeCode: string | null;
  exchangeId: string | null;
  exchangeMicCode: string | null;
  exchangeName: string | null;
  externalReferenceId: string | null;
  fee: string | null;
  figiCode: string | null;
  fxRate: string | null;
  id: string;
  institution: string | null;
  lastSync: string | null;
  optionSymbol: string | null;
  optionType: string | null;
  pagination: string | null;
  price: string | null;
  rawSymbol: string | null;
  securityTypeCode: string | null;
  securityTypeDescription: string | null;
  securityTypeId: string | null;
  settlementDate: string | null;
  snapTradeAccountId: string | null;
  symbol: string | null;
  symbolDescription: string | null;
  symbolId: string | null;
  symbolTicker: string | null;
  tradeDate: string | null;
  type: string | null;
  units: string | null;
  updatedAt: string | null;
  userId: string;
}

export interface EnhancedBrokerageAccount {
  accountDetails: {
    balance: number | string | null;
    id: string;
    lastSync: string | null;
  } | null;
  accountStatus: string;
  accountType: string;
  balanceData: unknown;
  balances: {
    buyingPower: number | string | null;
    cash: number | string | null;
    currencyCode: string | null;
    currencyName: string | null;
    id: string;
    lastSync: string | null;
  }[];
  cashRestrictions: unknown;
  createdDate: string;
  id: string;
  institutionName: string;
  name: string;
  userId: string;
}

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
