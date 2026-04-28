type AnyRecord = Record<string, unknown>;

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
