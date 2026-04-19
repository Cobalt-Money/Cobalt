import type { AccountOrderRecord } from "snaptrade-typescript-sdk";

import { toDecimalString } from "../lib.js";

function resolveOrderSymbol(order: AccountOrderRecord) {
  const symbolData = order.universal_symbol ?? null;
  let ticker = symbolData?.symbol ?? order.symbol;
  if (!ticker && order.brokerage_order_id) {
    ticker = order.brokerage_order_id.split("-").at(-1) ?? "UNKNOWN";
  }
  return { symbolData, ticker: ticker ?? "UNKNOWN" };
}

type OrderSymbolData = ReturnType<typeof resolveOrderSymbol>["symbolData"];

function mapOrderCoreIdentity(
  order: AccountOrderRecord,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date,
  ticker: string
) {
  return {
    accountId: dbAccountId,
    action: order.action ?? "buy",
    brokerageOrderId: order.brokerage_order_id ?? order.id,
    canceledQuantity: toDecimalString(order.canceled_quantity) || "0",
    childBrokerageOrderIds: order.child_brokerage_order_ids ?? null,
    lastSync,
    snapTradeAccountId: snaptradeAccountId,
    symbol: ticker,
    userId: appUserId,
  };
}

function mapOrderCoreCurrencyExchange(
  currency:
    | { code?: string | null; id?: string | null; name?: string | null }
    | null
    | undefined,
  exchange:
    | {
        code?: string | null;
        id?: string | null;
        mic_code?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  return {
    currencyCode: currency?.code ?? "USD",
    currencyId: currency?.id ?? null,
    currencyName: currency?.name ?? "US Dollar",
    exchangeCode: exchange?.code ?? null,
    exchangeId: exchange?.id ?? null,
    exchangeMicCode: exchange?.mic_code ?? null,
    exchangeName: exchange?.name ?? null,
  };
}

function mapOrderCoreSymbolMeta(
  symbolData: OrderSymbolData,
  secType:
    | { code?: string | null; description?: string | null; id?: string | null }
    | null
    | undefined,
  ticker: string
) {
  return {
    figiCode: symbolData?.figi_code ?? null,
    rawSymbol: symbolData?.raw_symbol ?? ticker,
    securityTypeCode: secType?.code ?? null,
    securityTypeDescription: secType?.description ?? null,
    securityTypeId: secType?.id ?? null,
    symbolDescription: symbolData?.description ?? null,
    symbolId: symbolData?.id ?? null,
  };
}

function mapOrderCore(
  order: AccountOrderRecord,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date
) {
  const { symbolData, ticker } = resolveOrderSymbol(order);
  const currency = symbolData?.currency;
  const exchange = symbolData?.exchange;
  const secType = symbolData?.type;
  return {
    ...mapOrderCoreIdentity(
      order,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      lastSync,
      ticker
    ),
    ...mapOrderCoreCurrencyExchange(currency, exchange),
    ...mapOrderCoreSymbolMeta(symbolData, secType, ticker),
  };
}

function mapOrderTimingAmounts(order: AccountOrderRecord) {
  return {
    executionPrice: toDecimalString(order.execution_price) || "0",
    filledQuantity: toDecimalString(order.filled_quantity) || "0",
    isMiniOption: order.is_mini_option ?? false,
    limitPrice: toDecimalString(order.limit_price) || "0",
    openQuantity: toDecimalString(order.open_quantity) || "0",
    optionSymbol: order.option_symbol ?? null,
    optionType: order.option_type ?? null,
    orderType: order.order_type ?? "market",
    quoteCurrency: order.quote_currency ?? null,
    quoteUniversalSymbol: order.quote_universal_symbol ?? null,
    status: order.status ?? "pending",
    stopPrice: toDecimalString(order.stop_price) || "0",
    strikePrice: order.strike_price ?? null,
    timeInForce: order.time_in_force ?? "DAY",
    totalQuantity: toDecimalString(order.total_quantity) || "0",
    universalSymbol: order.universal_symbol ?? null,
  };
}

function mapOrderTimingDates(order: AccountOrderRecord) {
  return {
    expirationDate: order.expiration_date
      ? new Date(order.expiration_date)
      : null,
    expiryDate: order.expiry_date ? new Date(order.expiry_date) : null,
    timeExecuted: order.time_executed ? new Date(order.time_executed) : null,
    timePlaced: order.time_placed ? new Date(order.time_placed) : new Date(),
    timeUpdated: order.time_updated ? new Date(order.time_updated) : null,
  };
}

function mapOrderTiming(order: AccountOrderRecord) {
  return { ...mapOrderTimingAmounts(order), ...mapOrderTimingDates(order) };
}

export function mapOrderRecord(
  order: AccountOrderRecord,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date
) {
  return {
    ...mapOrderCore(
      order,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      lastSync
    ),
    ...mapOrderTiming(order),
  };
}
