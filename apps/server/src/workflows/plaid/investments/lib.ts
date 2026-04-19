import type { Holding, InvestmentTransaction, Security } from "plaid";

export const INVESTMENT_TRANSACTIONS_PAGE_SIZE = 500;

const DAYS_OF_HISTORY = 720;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function mapSecurityCore(s: Security) {
  return {
    closePrice: s.close_price ?? null,
    closePriceAsOf: s.close_price_as_of ?? null,
    cusip: s.cusip ?? null,
    fixedIncome: s.fixed_income ?? null,
    industry: s.industry ?? null,
    institutionId: s.institution_id ?? null,
    institutionSecurityId: s.institution_security_id ?? null,
    isCashEquivalent: s.is_cash_equivalent ?? null,
    isin: s.isin ?? null,
    isoCurrencyCode: s.iso_currency_code ?? null,
    securityId: s.security_id,
  };
}

function mapSecurityMeta(s: Security) {
  return {
    marketIdentifierCode: s.market_identifier_code ?? null,
    name: s.name ?? null,
    optionContract: s.option_contract ?? null,
    proxySecurityId: s.proxy_security_id ?? null,
    sector: s.sector ?? null,
    sedol: s.sedol ?? null,
    subtype: s.subtype ?? null,
    tickerSymbol: s.ticker_symbol ?? null,
    type: s.type ?? null,
    unofficialCurrencyCode: s.unofficial_currency_code ?? null,
    updateDatetime: s.update_datetime ?? null,
  };
}

export function mapSecurity(s: Security) {
  return { ...mapSecurityCore(s), ...mapSecurityMeta(s) };
}

export function mapHolding(h: Holding) {
  return {
    costBasis: h.cost_basis ?? null,
    institutionPrice: h.institution_price,
    institutionPriceAsOf: h.institution_price_as_of ?? null,
    institutionPriceDatetime: h.institution_price_datetime ?? null,
    institutionValue: h.institution_value,
    isoCurrencyCode: h.iso_currency_code ?? null,
    plaidAccountId: h.account_id,
    quantity: h.quantity,
    securityId: h.security_id,
    unofficialCurrencyCode: h.unofficial_currency_code ?? null,
    vestedQuantity: h.vested_quantity ?? null,
    vestedValue: h.vested_value ?? null,
  };
}

export function mapInvestmentTransaction(tx: InvestmentTransaction) {
  return {
    amount: tx.amount,
    cancelTransactionId: tx.cancel_transaction_id ?? null,
    date: tx.date,
    fees: tx.fees ?? null,
    investmentTransactionId: tx.investment_transaction_id,
    isoCurrencyCode: tx.iso_currency_code ?? null,
    name: tx.name,
    plaidAccountId: tx.account_id,
    price: tx.price,
    quantity: tx.quantity,
    securityId: tx.security_id ?? null,
    subtype: tx.subtype,
    type: tx.type,
    unofficialCurrencyCode: tx.unofficial_currency_code ?? null,
  };
}

function toDateOnly(date: Date): string {
  return date.toISOString().split("T").at(0) ?? "";
}

/** Compute the 2-year lookback range for investment transaction history. */
export function computeInvestmentTransactionsDateRange(): {
  startDate: string;
  endDate: string;
} {
  const now = Date.now();
  return {
    endDate: toDateOnly(new Date(now)),
    startDate: toDateOnly(new Date(now - DAYS_OF_HISTORY * MS_PER_DAY)),
  };
}
