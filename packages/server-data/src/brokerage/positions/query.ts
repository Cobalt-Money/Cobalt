import { db } from "@cobalt-web/db";

import { toISOString } from "../_shared/lib.js";
import type { PositionsQuery, PositionsResponse } from "./schema.js";

const numStr = (v: string | null | undefined): string | null =>
  v === null || v === undefined ? null : v;

const groupBy = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
};

// Inline ownership: accountId (externalId) is filtered via `account.externalId`
// + `userId` — non-owners get an empty list, same as a 404 for our threat model.
export async function getPositions(
  userId: string,
  params: PositionsQuery,
): Promise<PositionsResponse> {
  const { accountId, limit, offset } = params;

  const rows = await db.query.holding.findMany({
    columns: {
      averagePrice: true,
      costBasis: true,
      createdAt: true,
      currency: true,
      id: true,
      institutionPrice: true,
      institutionValue: true,
      isQuotable: true,
      isTradable: true,
      lastSyncAt: true,
      openPnl: true,
      quantity: true,
      securityId: true,
      updatedAt: true,
    },
    ...(limit === undefined ? {} : { limit }),
    ...(offset === undefined ? {} : { offset }),
    where: {
      userId: { eq: userId },
      ...(accountId ? { account: { externalId: { eq: accountId } } } : {}),
    },
    with: {
      account: { columns: { externalId: true } },
      security: {
        columns: {
          exchangeCode: true,
          exchangeName: true,
          externalId: true,
          figiCode: true,
          marketIdentifierCode: true,
          name: true,
          subtype: true,
          tickerSymbol: true,
          type: true,
        },
      },
    },
  });

  rows.sort((a, b) => (a.security.tickerSymbol ?? "").localeCompare(b.security.tickerSymbol ?? ""));

  const positions = rows.map((r) => {
    // Plaid rows lack averagePrice/openPnl — fall back to computed values.
    const quantity = Number(r.quantity ?? 0);
    const costBasisNum = Number(r.costBasis ?? 0);
    const institutionValueNum = Number(r.institutionValue ?? 0);
    const averagePurchasePrice =
      r.averagePrice ?? (quantity > 0 ? String(costBasisNum / quantity) : "0");
    const openPnl = r.openPnl ?? String(institutionValueNum - costBasisNum);

    const externalId = r.account.externalId ?? "";
    const sec = r.security;
    return {
      accountId: externalId,
      averagePurchasePrice: numStr(averagePurchasePrice),
      createdAt: toISOString(r.createdAt),
      currencyCode: r.currency ?? "USD",
      currencyId: null,
      currencyName: "US Dollar",
      exchangeCode: sec.exchangeCode,
      exchangeId: null,
      exchangeMicCode: sec.marketIdentifierCode,
      exchangeName: sec.exchangeName,
      figiCode: sec.figiCode,
      id: r.id,
      isQuotable: r.isQuotable ?? true,
      isTradable: r.isTradable ?? false,
      lastSync: toISOString(r.lastSyncAt ?? r.updatedAt),
      localId: null,
      openPnl: numStr(openPnl),
      price: numStr(r.institutionPrice),
      rawSymbol: sec.tickerSymbol,
      securityTypeCode: sec.type,
      securityTypeDescription: sec.subtype,
      securityTypeId: null,
      snapTradeAccountId: externalId,
      symbol: sec.tickerSymbol,
      symbolDescription: sec.name,
      symbolId: sec.externalId,
      units: numStr(r.quantity),
      updatedAt: toISOString(r.updatedAt),
      userId,
    };
  });

  return {
    positions,
    positionsByAccount: groupBy(positions, (p) => p.accountId),
  };
}
