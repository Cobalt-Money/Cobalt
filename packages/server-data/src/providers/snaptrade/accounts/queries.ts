import { db } from "@cobalt-web/db";

export interface AccountRef {
  id: string;
  userId: string;
}

/**
 * Resolve financial_account rows for a batch of SnapTrade external account_ids.
 * Returns a Map keyed by SnapTrade account_id. Missing entries = orphaned/unsynced.
 */
export async function lookupFinancialAccountsBySnaptradeIds(
  snaptradeAccountIds: string[],
): Promise<Map<string, AccountRef>> {
  if (snaptradeAccountIds.length === 0) {
    return new Map();
  }
  const rows = await db.query.financialAccount.findMany({
    columns: { externalId: true, id: true, userId: true },
    where: {
      externalId: { in: snaptradeAccountIds },
      source: { eq: "snaptrade" },
    },
  });
  const map = new Map<string, AccountRef>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, { id: r.id, userId: r.userId });
    }
  }
  return map;
}
