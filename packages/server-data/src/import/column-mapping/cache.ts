import { db } from "@cobalt-web/db";
import { csvMappingCache } from "@cobalt-web/db/schema/imports/csv-mapping-cache";
import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";

import { headerSignature } from "../upload/gates";

export async function lookupColumnMappingCache(
  userId: string,
  headers: string[],
): Promise<CsvMapping | null> {
  const headerHash = headerSignature(headers);
  const cached = await db.query.csvMappingCache.findFirst({
    where: { headerHash: { eq: headerHash }, userId: { eq: userId } },
  });
  return cached?.mapping ?? null;
}

export async function cacheConfirmedMapping(
  userId: string,
  headers: string[],
  mapping: CsvMapping,
): Promise<void> {
  const headerHash = headerSignature(headers);
  await db
    .insert(csvMappingCache)
    .values({ headerHash, mapping, userId })
    .onConflictDoUpdate({
      set: { confirmedAt: new Date(), mapping },
      target: [csvMappingCache.userId, csvMappingCache.headerHash],
    });
}
