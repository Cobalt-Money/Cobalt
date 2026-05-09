import { db } from "@cobalt-web/db";
import { accountMappingCache } from "@cobalt-web/db/schema/imports/account-mapping-cache";

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
  return new Map(cached.map((c) => [c.sourceLabel, c.cobaltAccountId]));
}

export async function cacheAccountChoice(
  userId: string,
  sourceLabel: string,
  cobaltAccountId: string | null,
): Promise<void> {
  await db
    .insert(accountMappingCache)
    .values({ cobaltAccountId, sourceLabel, userId })
    .onConflictDoUpdate({
      set: { cobaltAccountId, confirmedAt: new Date() },
      target: [accountMappingCache.userId, accountMappingCache.sourceLabel],
    });
}
