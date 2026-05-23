import { db } from "@cobalt-web/db";

import { toISOString } from "../_shared/lib.js";
import type { BalancesResponse } from "./schema.js";

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

export async function getBalances(userId: string): Promise<BalancesResponse> {
  const rows = await db.query.balance.findMany({
    columns: {
      buyingPower: true,
      createdAt: true,
      currency: true,
      current: true,
      id: true,
      lastSyncAt: true,
      updatedAt: true,
    },
    orderBy: { currency: "asc" },
    where: { userId: { eq: userId } },
    with: {
      account: {
        columns: { externalId: true },
      },
    },
  });

  const balances = rows.map((r) => ({
    accountId: r.account.externalId ?? "",
    buyingPower: numStr(r.buyingPower),
    cash: numStr(r.current),
    createdAt: toISOString(r.createdAt),
    currencyCode: r.currency ?? "USD",
    currencyName: "US Dollar",
    id: r.id,
    lastSync: toISOString(r.lastSyncAt ?? r.updatedAt),
    snapTradeAccountId: r.account.externalId ?? "",
    updatedAt: toISOString(r.updatedAt),
    userId,
  }));

  return {
    balances,
    balancesByAccount: groupBy(balances, (b) => b.accountId),
  };
}
