import { db } from "@cobalt-web/db";
import { categoryMappingCache } from "@cobalt-web/db/schema/imports/category-mapping-cache";
import { sql } from "drizzle-orm";

export interface CachedCategoryChoice {
  action: "link" | "create" | "skip";
  targetCategoryId: string | null;
  newName: string | null;
}

export async function lookupCategoryMappingCache(
  userId: string,
  sourceLabels: string[],
): Promise<Map<string, CachedCategoryChoice>> {
  if (sourceLabels.length === 0) {
    return new Map();
  }
  const cached = await db.query.categoryMappingCache.findMany({
    where: {
      sourceLabel: { in: sourceLabels },
      userId: { eq: userId },
    },
  });
  const map = new Map(
    cached.map((c) => [
      c.sourceLabel,
      {
        action: c.action,
        newName: c.newName ?? null,
        targetCategoryId: c.targetCategoryId,
      },
    ]),
  );
  const hits = sourceLabels.filter((l) => map.has(l));
  console.log(
    `[import.categoryMappingCache] lookup user=${userId} labels=${JSON.stringify(sourceLabels)} hits=${hits.length}/${sourceLabels.length} (${JSON.stringify(hits)})`,
  );
  return map;
}

export async function cacheCategoryChoice(
  userId: string,
  sourceLabel: string,
  choice: {
    action: "link" | "create" | "skip";
    targetCategoryId: string | null;
    newName?: string | null;
  },
): Promise<void> {
  await cacheCategoryChoices(userId, [{ choice, sourceLabel }]);
}

/** Bulk upsert — one INSERT for the whole batch instead of N round-trips. */
export async function cacheCategoryChoices(
  userId: string,
  entries: {
    sourceLabel: string;
    choice: {
      action: "link" | "create" | "skip";
      targetCategoryId: string | null;
      newName?: string | null;
    };
  }[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  await db
    .insert(categoryMappingCache)
    .values(
      entries.map(({ choice, sourceLabel }) => ({
        action: choice.action,
        newName: choice.newName ?? null,
        sourceLabel,
        targetCategoryId: choice.targetCategoryId,
        userId,
      })),
    )
    .onConflictDoUpdate({
      set: {
        action: sql`excluded.action`,
        confirmedAt: new Date(),
        newName: sql`excluded.new_name`,
        targetCategoryId: sql`excluded.target_category_id`,
      },
      target: [categoryMappingCache.userId, categoryMappingCache.sourceLabel],
    });
  console.log(`[import.categoryMappingCache] write user=${userId} batch=${entries.length}`);
}
