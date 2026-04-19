import type { brokeragePositions } from "@cobalt-web/db/schema/brokerage";
import type { InferInsertModel } from "drizzle-orm";

import { toDecimalString } from "../lib.js";

type AnyRecord = Record<string, unknown>;

export type BrokeragePositionInsert = InferInsertModel<
  typeof brokeragePositions
>;

export function resolvePositionNestedData(position: AnyRecord) {
  const symbolData =
    (position.symbol as AnyRecord)?.symbol ?? position.symbol ?? {};
  const currencyData =
    (symbolData as AnyRecord).currency ?? position.currency ?? {};
  const exchangeData =
    (symbolData as AnyRecord).exchange ?? position.exchange ?? {};
  const securityTypeData =
    (symbolData as AnyRecord).type ?? position.security_type ?? {};
  const ticker =
    (symbolData as AnyRecord).symbol ?? position.raw_symbol ?? "UNKNOWN";
  return { currencyData, exchangeData, securityTypeData, symbolData, ticker };
}

function mapPositionPricingFinancials(
  position: AnyRecord,
  resolved: ReturnType<typeof resolvePositionNestedData>
) {
  const { currencyData, exchangeData } = resolved;
  return {
    averagePurchasePrice:
      toDecimalString(position.average_purchase_price as number) || "0",
    currencyCode:
      (currencyData as AnyRecord).code ?? position.currency_code ?? "USD",
    currencyId: (currencyData as AnyRecord).id ?? position.currency_id ?? null,
    currencyName:
      (currencyData as AnyRecord).name ?? position.currency_name ?? "US Dollar",
    exchangeCode:
      (exchangeData as AnyRecord).code ?? position.exchange_code ?? null,
    exchangeId: (exchangeData as AnyRecord).id ?? position.exchange_id ?? null,
    exchangeMicCode:
      (exchangeData as AnyRecord).mic_code ??
      position.exchange_mic_code ??
      null,
    exchangeName:
      (exchangeData as AnyRecord).name ?? position.exchange_name ?? null,
    openPnl: toDecimalString(position.open_pnl as number) || "0",
    price: toDecimalString(position.price as number) || "0",
    units: toDecimalString(position.units as number) || "0",
  };
}

function mapPositionPricingSecurityType(
  position: AnyRecord,
  resolved: ReturnType<typeof resolvePositionNestedData>
) {
  const { securityTypeData } = resolved;
  return {
    securityTypeCode:
      (securityTypeData as AnyRecord).code ??
      position.security_type_code ??
      null,
    securityTypeDescription:
      (securityTypeData as AnyRecord).description ??
      position.security_type_description ??
      null,
    securityTypeId:
      (securityTypeData as AnyRecord).id ?? position.security_type_id ?? null,
  };
}

function mapPositionPricing(
  position: AnyRecord,
  resolved: ReturnType<typeof resolvePositionNestedData>
) {
  return {
    ...mapPositionPricingFinancials(position, resolved),
    ...mapPositionPricingSecurityType(position, resolved),
  };
}

export function mapPositionRecord(
  position: AnyRecord,
  dbAccountId: string,
  snaptradeAccountId: string,
  appUserId: string,
  lastSync: Date
): BrokeragePositionInsert {
  const resolved = resolvePositionNestedData(position);
  const { symbolData, ticker } = resolved;
  return {
    accountId: dbAccountId,
    figiCode: (symbolData as AnyRecord).figi_code ?? position.figi_code ?? null,
    isQuotable:
      (position.is_quotable as boolean | undefined) ??
      (symbolData as AnyRecord).is_quotable ??
      true,
    isTradable:
      (position.is_tradable as boolean | undefined) ??
      (symbolData as AnyRecord).is_tradable ??
      true,
    lastSync,
    localId: position.local_id ?? (symbolData as AnyRecord).local_id ?? null,
    rawSymbol:
      (symbolData as AnyRecord).raw_symbol ?? position.raw_symbol ?? ticker,
    snapTradeAccountId: snaptradeAccountId,
    symbol: ticker,
    symbolDescription:
      (symbolData as AnyRecord).description ??
      position.symbol_description ??
      null,
    symbolId: (symbolData as AnyRecord).id ?? position.symbol_id ?? null,
    userId: appUserId,
    ...mapPositionPricing(position, resolved),
  } as BrokeragePositionInsert;
}
