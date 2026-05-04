import { db } from "@cobalt-web/db";

/**
 * Resolve security rows for a batch of Plaid security_ids. Returns Map keyed
 * by Plaid security_id → security.id (uuid).
 */
export async function lookupSecuritiesByPlaidIds(
  securityIds: string[],
): Promise<Map<string, string>> {
  if (securityIds.length === 0) {
    return new Map();
  }
  const rows = await db.query.security.findMany({
    columns: { externalId: true, id: true },
    where: {
      externalId: { in: securityIds },
      source: { eq: "plaid" },
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
