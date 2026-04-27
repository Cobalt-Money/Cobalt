import { db } from "@cobalt-web/db";
import { security } from "@cobalt-web/db/schema/banking/investments/security";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Resolve security rows for a batch of Plaid security_ids. Returns Map keyed
 * by Plaid security_id → security.id (uuid).
 */
export async function lookupSecuritiesByPlaidIds(
  securityIds: string[]
): Promise<Map<string, string>> {
  if (securityIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({ externalId: security.externalId, id: security.id })
    .from(security)
    .where(
      and(
        eq(security.source, "plaid"),
        inArray(security.externalId, securityIds)
      )
    );
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, r.id);
    }
  }
  return map;
}
