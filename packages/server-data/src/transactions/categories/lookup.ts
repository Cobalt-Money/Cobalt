import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { CategorySystemKey } from "./system-keys.js";

/**
 * SRI-311: resolve seeded `systemKey`s → category row ids for one user. Used by
 * Plaid sync, backfill, and any code that needs to write `transaction.categoryId`
 * from a Plaid PFC mapping.
 *
 * Single batched SELECT. Returns a map keyed by `systemKey`. Missing keys are
 * absent from the map (caller decides whether to fall back to `uncategorized`).
 * Skips soft-deleted rows.
 */
export async function lookupCategoryIdsBySystemKey(
  userId: string,
  systemKeys: readonly CategorySystemKey[],
): Promise<Map<CategorySystemKey, string>> {
  if (systemKeys.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ id: category.id, systemKey: category.systemKey })
    .from(category)
    .where(
      and(
        eq(category.userId, userId),
        isNull(category.deletedAt),
        inArray(category.systemKey, systemKeys as CategorySystemKey[]),
      ),
    );

  const map = new Map<CategorySystemKey, string>();
  for (const row of rows) {
    if (row.systemKey) {
      map.set(row.systemKey as CategorySystemKey, row.id);
    }
  }
  return map;
}

/**
 * Convenience: get the user's `uncategorized` cat id. Hard-locked seed row;
 * Plaid sync falls back here when a PFC has no mapping or maps to a deleted row.
 */
export async function getUncategorizedId(userId: string): Promise<string | undefined> {
  const map = await lookupCategoryIdsBySystemKey(userId, ["uncategorized"]);
  return map.get("uncategorized");
}
