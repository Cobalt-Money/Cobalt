import type { Holding, Security, InvestmentTransaction } from "plaid";

/** Map identifiers and classification fields from a Plaid Security. */
export function mapSecurityIdentifiers(s: Security) {
  return {
    cusip: s.cusip ?? null,
    industry: s.industry ?? null,
    institutionId: s.institution_id ?? null,
    institutionSecurityId: s.institution_security_id ?? null,
    isin: s.isin ?? null,
    marketIdentifierCode: s.market_identifier_code ?? null,
    proxySecurityId: s.proxy_security_id ?? null,
    sector: s.sector ?? null,
    sedol: s.sedol ?? null,
    subtype: s.subtype ?? null,
    type: s.type ?? null,
  };
}

/** Map a Plaid Security object to the investmentSecurity insert record. */
export function mapSecurityToRecord(s: Security) {
  return {
    ...mapSecurityIdentifiers(s),
    closePrice: s.close_price ?? null,
    closePriceAsOf: s.close_price_as_of ?? null,
    fixedIncome: s.fixed_income ?? null,
    isCashEquivalent: s.is_cash_equivalent ?? null,
    isoCurrencyCode: s.iso_currency_code ?? null,
    name: s.name ?? null,
    optionContract: s.option_contract ?? null,
    securityId: s.security_id,
    tickerSymbol: s.ticker_symbol ?? null,
    unofficialCurrencyCode: s.unofficial_currency_code ?? null,
    updateDatetime: s.update_datetime ?? null,
  };
}

/**
 * Map a Plaid Holding object to the investmentPosition insert record.
 */
export function mapHoldingToRecord(h: Holding) {
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

/** Map a Plaid InvestmentTransaction to the investmentActivity insert record. */
export function mapInvestmentTransactionToRecord(tx: InvestmentTransaction) {
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
