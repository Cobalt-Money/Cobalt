import { randomUUID } from "node:crypto";

import type {
  PlaidHoldingRow,
  PlaidInvestmentAccountRow,
  PlaidInvestmentTransactionRow,
} from "./queries.js";

/** Maps Plaid investment transaction subtype/type to SnapTrade-style activity labels. */

const SUBTYPE_LABEL: Record<string, string> = {
  "account fee": "FEE",
  contribution: "CONTRIBUTION",
  deposit: "CONTRIBUTION",
  dividend: "DIVIDEND",
  "dividend reinvestment": "DIVIDEND",
  "fund fee": "FEE",
  interest: "INTEREST",
  "interest receivable": "INTEREST",
  "interest reinvestment": "INTEREST",
  "legal fee": "FEE",
  "long-term capital gain": "CAPITAL_GAIN",
  "long-term capital gain reinvestment": "CAPITAL_GAIN",
  "management fee": "FEE",
  merger: "CORPORATE_ACTION",
  "miscellaneous fee": "FEE",
  "non-qualified dividend": "DIVIDEND",
  "non-resident tax": "TAX",
  "qualified dividend": "DIVIDEND",
  "short-term capital gain": "CAPITAL_GAIN",
  "short-term capital gain reinvestment": "CAPITAL_GAIN",
  "spin off": "CORPORATE_ACTION",
  split: "CORPORATE_ACTION",
  "stock distribution": "CORPORATE_ACTION",
  tax: "TAX",
  "tax withheld": "TAX",
  transfer: "TRANSFER",
  "transfer fee": "FEE",
  "trust fee": "FEE",
  withdrawal: "WITHDRAWAL",
};

const TYPE_LABEL: Record<string, string> = {
  buy: "BUY",
  cancel: "CANCEL",
  cash: "CASH",
  fee: "FEE",
  sell: "SELL",
  transfer: "TRANSFER",
};

export function mapPlaidInvestmentType(type: string, subtype: string): string {
  const sub = SUBTYPE_LABEL[subtype];
  if (sub !== undefined) {
    return sub;
  }
  const t = TYPE_LABEL[type];
  if (t !== undefined) {
    return t;
  }
  return type.toUpperCase();
}

/** SnapTrade-shaped position row for merged brokerage payloads (JSON-serializable). */
export interface MergedBrokeragePosition {
  accountId: string;
  averagePurchasePrice: string | null;
  createdAt: string;
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
  updatedAt: string;
  userId: string;
}

export interface MergedBrokerageActivity {
  accountId: string;
  activityId: string | null;
  amount: string | null;
  createdAt: string;
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
  updatedAt: string;
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
  portfolioGroup: string | null;
  userId: string;
}

function toIsoString(d: Date | string | null | undefined): string | null {
  if (d === null || d === undefined) {
    return null;
  }
  if (d instanceof Date) {
    return d.toISOString();
  }
  return String(d);
}

export function adaptPlaidHoldingsToPositions(
  holdings: PlaidHoldingRow[],
  userId: string
): MergedBrokeragePosition[] {
  return holdings.map((h) => {
    const costBasis = h.costBasis ?? 0;
    const openPnl = h.institutionValue - costBasis;
    const averagePurchasePrice =
      h.quantity > 0 ? String(costBasis / h.quantity) : "0";

    return {
      accountId: h.plaidAccountId,
      averagePurchasePrice,
      createdAt: new Date().toISOString(),
      currencyCode: h.isoCurrencyCode ?? "USD",
      currencyId: null,
      currencyName: null,
      exchangeCode: null,
      exchangeId: null,
      exchangeMicCode: null,
      exchangeName: null,
      figiCode: null,
      id: h.id,
      isQuotable: true,
      isTradable: false,
      lastSync: toIsoString(h.holdingUpdatedAt),
      localId: null,
      openPnl: String(openPnl),
      price: String(h.institutionPrice),
      rawSymbol: h.tickerSymbol ?? null,
      securityTypeCode: h.securityType ?? null,
      securityTypeDescription: h.securitySubtype ?? null,
      securityTypeId: null,
      snapTradeAccountId: `plaid-${h.plaidAccountId}`,
      symbol: h.tickerSymbol ?? null,
      symbolDescription: h.securityName ?? null,
      symbolId: h.securityId,
      units: String(h.quantity),
      updatedAt: new Date().toISOString(),
      userId,
    };
  });
}

export function adaptPlaidInvestmentTransactionsToActivities(
  transactions: PlaidInvestmentTransactionRow[],
  userId: string
): MergedBrokerageActivity[] {
  return transactions.map((tx) => ({
    accountId: tx.plaidAccountId,
    activityId: tx.investmentTransactionId,
    amount:
      tx.amount === null || tx.amount === undefined ? null : String(tx.amount),
    createdAt: new Date().toISOString(),
    currencyCode: tx.isoCurrencyCode ?? "USD",
    currencyId: null,
    currencyName: null,
    description: tx.name,
    exchangeCode: null,
    exchangeId: null,
    exchangeMicCode: null,
    exchangeName: null,
    externalReferenceId: null,
    fee: tx.fees === null || tx.fees === undefined ? null : String(tx.fees),
    figiCode: null,
    fxRate: null,
    id: tx.id,
    institution: null,
    lastSync: null,
    optionSymbol: null,
    optionType: null,
    pagination: null,
    price:
      tx.price === null || tx.price === undefined ? null : String(tx.price),
    rawSymbol: tx.tickerSymbol ?? null,
    securityTypeCode: tx.securityType ?? null,
    securityTypeDescription: null,
    securityTypeId: null,
    settlementDate: null,
    snapTradeAccountId: `plaid-${tx.plaidAccountId}`,
    symbol: null,
    symbolDescription: tx.securityName ?? null,
    symbolId: tx.securityId ?? null,
    symbolTicker: tx.tickerSymbol ?? null,
    tradeDate: tx.date ? String(tx.date).slice(0, 10) : null,
    type: mapPlaidInvestmentType(tx.type, tx.subtype),
    units:
      tx.quantity === null || tx.quantity === undefined
        ? null
        : String(tx.quantity),
    updatedAt: new Date().toISOString(),
    userId,
  }));
}

export function adaptPlaidInvestmentAccountsToBrokerage(
  accounts: PlaidInvestmentAccountRow[],
  userId: string
): EnhancedBrokerageAccount[] {
  return accounts.map((acc) => ({
    accountDetails: {
      balance: acc.currentBalance ?? null,
      id: randomUUID(),
      lastSync: toIsoString(acc.updatedAt),
    },
    accountStatus: "open",
    accountType: acc.subtype || acc.type || "investment",
    balanceData: null,
    balances: [
      {
        buyingPower: null,
        cash: acc.availableBalance ?? null,
        currencyCode: acc.currency ?? "USD",
        currencyName: null,
        id: randomUUID(),
        lastSync: toIsoString(acc.updatedAt),
      },
    ],
    cashRestrictions: null,
    createdDate: new Date().toISOString(),
    id: `plaid-inv-${acc.plaidAccountId}`,
    institutionName: acc.institutionName || "Unknown",
    name: acc.accountName || "Investment Account",
    portfolioGroup: null,
    userId,
  }));
}
