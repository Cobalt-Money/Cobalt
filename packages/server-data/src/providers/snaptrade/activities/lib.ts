import type { UniversalActivity } from "snaptrade-typescript-sdk";

import { extractDateFromISO, toDecimalString } from "../lib.js";

type AnyRecord = Record<string, unknown>;

function resolveActivityNestedData(activity: UniversalActivity) {
  const symbolData = (activity.symbol as AnyRecord | undefined) ?? {};
  const currencyData =
    (symbolData.currency as AnyRecord | undefined) ??
    (activity.currency as AnyRecord | undefined) ??
    {};
  const exchangeData =
    (symbolData.exchange as AnyRecord | undefined) ??
    (activity.exchange as AnyRecord | undefined) ??
    {};
  const securityTypeData =
    (symbolData.type as AnyRecord | undefined) ??
    (activity.security_type as AnyRecord | undefined) ??
    {};
  const ticker =
    (symbolData.symbol as string | undefined) ?? activity.symbol_ticker ?? null;
  return { currencyData, exchangeData, securityTypeData, symbolData, ticker };
}

function mapActivityCore(
  activity: UniversalActivity,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date
) {
  const { currencyData, exchangeData, ticker } =
    resolveActivityNestedData(activity);
  return {
    accountId: dbAccountId,
    activityId: activity.activity_id ?? activity.id,
    amount: toDecimalString(activity.amount) || "0",
    currencyCode:
      (currencyData.code as string | undefined) ??
      activity.currency_code ??
      "USD",
    currencyId:
      (currencyData.id as string | undefined) ?? activity.currency_id ?? null,
    currencyName:
      (currencyData.name as string | undefined) ??
      activity.currency_name ??
      "US Dollar",
    description: activity.description ?? "",
    exchangeCode:
      (exchangeData.code as string | undefined) ??
      activity.exchange_code ??
      null,
    exchangeId:
      (exchangeData.id as string | undefined) ?? activity.exchange_id ?? null,
    exchangeMicCode:
      (exchangeData.mic_code as string | undefined) ??
      activity.exchange_mic_code ??
      null,
    exchangeName:
      (exchangeData.name as string | undefined) ??
      activity.exchange_name ??
      null,
    lastSync,
    snapTradeAccountId: snaptradeAccountId,
    symbol: (activity.symbol as string | null | undefined) ?? null,
    symbolTicker: ticker,
    userId: appUserId,
  };
}

function mapActivityFinancials(activity: UniversalActivity) {
  return {
    externalReferenceId: activity.external_reference_id ?? null,
    fee: toDecimalString(activity.fee) || "0",
    fxRate: toDecimalString(activity.fx_rate) || "0",
    institution: activity.institution ?? null,
    optionSymbol: activity.option_symbol ?? null,
    optionType: activity.option_type ?? null,
    pagination: activity.pagination ?? null,
    price: toDecimalString(activity.price) || "0",
    type: activity.type ?? "unknown",
    units: toDecimalString(activity.units) || "0",
  };
}

function mapActivitySymbolFields(activity: UniversalActivity) {
  const { symbolData, securityTypeData, ticker } =
    resolveActivityNestedData(activity);
  return {
    figiCode:
      (symbolData.figi_code as string | undefined) ??
      activity.figi_code ??
      null,
    rawSymbol:
      (symbolData.raw_symbol as string | undefined) ??
      activity.raw_symbol ??
      ticker,
    securityTypeCode:
      (securityTypeData.code as string | undefined) ??
      activity.security_type_code ??
      null,
    securityTypeDescription:
      (securityTypeData.description as string | undefined) ??
      activity.security_type_description ??
      null,
    securityTypeId:
      (securityTypeData.id as string | undefined) ??
      activity.security_type_id ??
      null,
    settlementDate: activity.settlement_date
      ? extractDateFromISO(activity.settlement_date)
      : null,
    symbolDescription:
      (symbolData.description as string | undefined) ??
      activity.symbol_description ??
      null,
    symbolId:
      (symbolData.id as string | undefined) ?? activity.symbol_id ?? null,
    tradeDate: activity.trade_date
      ? extractDateFromISO(activity.trade_date)
      : null,
  };
}

function mapActivityMeta(activity: UniversalActivity) {
  return {
    ...mapActivityFinancials(activity),
    ...mapActivitySymbolFields(activity),
  };
}

export function mapActivityRecord(
  activity: UniversalActivity,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date
) {
  return {
    ...mapActivityCore(
      activity,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      lastSync
    ),
    ...mapActivityMeta(activity),
  };
}
