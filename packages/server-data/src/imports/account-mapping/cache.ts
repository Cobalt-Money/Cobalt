import { db } from "@cobalt-web/db";
import { accountMappingCache } from "@cobalt-web/db/schema/imports/account-mapping-cache";
import { sql } from "drizzle-orm";

export async function lookupAccountMappingCache(
  userId: string,
  sourceLabels: string[],
): Promise<Map<string, string | null>> {
  if (sourceLabels.length === 0) {
    return new Map();
  }
  const cached = await db.query.accountMappingCache.findMany({
    columns: { cobaltAccountId: true, sourceLabel: true },
    where: {
      sourceLabel: { in: sourceLabels },
      userId: { eq: userId },
    },
  });
  const map = new Map(cached.map((c) => [c.sourceLabel, c.cobaltAccountId]));
  const hits = sourceLabels.filter((l) => map.has(l));
  console.log(
    `[import.accountMappingCache] lookup user=${userId} labels=${JSON.stringify(sourceLabels)} hits=${hits.length}/${sourceLabels.length} (${JSON.stringify(hits)})`,
  );
  return map;
}

export async function cacheAccountChoice(
  userId: string,
  sourceLabel: string,
  cobaltAccountId: string | null,
): Promise<void> {
  await cacheAccountChoices(userId, [{ cobaltAccountId, sourceLabel }]);
}

/** Bulk upsert — one INSERT for the whole batch instead of N round-trips. */
export async function cacheAccountChoices(
  userId: string,
  choices: { sourceLabel: string; cobaltAccountId: string | null }[],
): Promise<void> {
  if (choices.length === 0) {
    return;
  }
  await db
    .insert(accountMappingCache)
    .values(choices.map((c) => ({ ...c, userId })))
    .onConflictDoUpdate({
      set: {
        cobaltAccountId: sql`excluded.cobalt_account_id`,
        confirmedAt: new Date(),
      },
      target: [accountMappingCache.userId, accountMappingCache.sourceLabel],
    });
  console.log(`[import.accountMappingCache] write user=${userId} batch=${choices.length}`);
}
