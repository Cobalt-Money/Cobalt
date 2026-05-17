import { db } from "@cobalt-web/db";
import { csvMappingCache } from "@cobalt-web/db/schema/imports/csv-mapping-cache";
import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";

import { headerSignature } from "../upload/gates";

/**
 * Per-user lookup. The cache is the user's previously-confirmed mapping for
 * this exact header layout — written when they click "Continue" in step 2.
 * Returns `null` for first-time imports (caller runs the AI agent).
 */
export async function lookupColumnMappingCache(
  userId: string,
  headers: string[],
): Promise<CsvMapping | null> {
  const headerHash = headerSignature(headers);
  const hit = await db.query.csvMappingCache.findFirst({
    where: { headerHash: { eq: headerHash }, userId: { eq: userId } },
  });
  console.log(
    `[import.columnMappingCache] lookup user=${userId} headerHash=${headerHash.slice(0, 12)} headers=${JSON.stringify(headers)} ${hit ? "HIT" : "MISS"}`,
  );
  return hit?.mapping ?? null;
}

/** Write — fires from the column-mapping confirm action after user clicks Continue. */
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
  console.log(
    `[import.columnMappingCache] write user=${userId} headerHash=${headerHash.slice(0, 12)} headers=${JSON.stringify(headers)}`,
  );
}
