import { db } from "@cobalt-web/db";
import { categoryMappingCache } from "@cobalt-web/db/schema/imports/category-mapping-cache";

export interface CachedCategoryChoice {
  action: "link" | "linkRename" | "create" | "skip";
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
  return new Map(
    cached.map((c) => [
      c.sourceLabel,
      {
        action: c.action,
        newName: c.newName ?? null,
        targetCategoryId: c.targetCategoryId,
      },
    ]),
  );
}

export async function cacheCategoryChoice(
  userId: string,
  sourceLabel: string,
  choice: {
    action: "link" | "linkRename" | "create" | "skip";
    targetCategoryId: string | null;
    newName?: string | null;
  },
): Promise<void> {
  await db
    .insert(categoryMappingCache)
    .values({
      action: choice.action,
      newName: choice.newName ?? null,
      sourceLabel,
      targetCategoryId: choice.targetCategoryId,
      userId,
    })
    .onConflictDoUpdate({
      set: {
        action: choice.action,
        confirmedAt: new Date(),
        newName: choice.newName ?? null,
        targetCategoryId: choice.targetCategoryId,
      },
      target: [categoryMappingCache.userId, categoryMappingCache.sourceLabel],
    });
}
