import { db } from "@cobalt-web/db";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { and, eq, isNull } from "drizzle-orm";

import type { ReorderCategoryGroups } from "./schema.js";

export async function reorderCategoryGroups(
  userId: string,
  body: ReorderCategoryGroups,
): Promise<void> {
  const ids = [...new Set(body.groupIds)];
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(categoryGroup)
        .set({ order: i })
        .where(
          and(
            eq(categoryGroup.id, id),
            eq(categoryGroup.userId, userId),
            isNull(categoryGroup.deletedAt),
          ),
        );
    }
  });
}
