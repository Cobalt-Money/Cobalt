import { db } from "@cobalt-web/db";

/**
 * Resolve security rows for a batch of SnapTrade symbol_ids. Returns Map keyed
 * by SnapTrade symbol_id → security.id (uuid).
 */
export async function lookupSecuritiesBySnaptradeSymbolIds(
  symbolIds: string[]
): Promise<Map<string, string>> {
  if (symbolIds.length === 0) {
    return new Map();
  }
  const rows = await db.query.security.findMany({
    columns: { externalId: true, id: true },
    where: {
      externalId: { in: symbolIds },
      source: { eq: "snaptrade" },
    },
  });
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, r.id);
    }
  }
  return map;
}
