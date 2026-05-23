import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { and, eq, isNull } from "drizzle-orm";

import { CategoryMutationError } from "../_shared/errors.js";
import type { ReorderCategories } from "./schema.js";

export async function reorderCategories(userId: string, body: ReorderCategories): Promise<void> {
  const ids = [...new Set(body.categoryIds)];
  await db.transaction(async (tx) => {
    const group = await tx.query.categoryGroup.findFirst({
      columns: { id: true },
      where: {
        deletedAt: { isNull: true },
        id: { eq: body.groupId },
        userId: { eq: userId },
      },
    });
    if (!group) {
      throw new CategoryMutationError("group_not_found", "Group not found");
    }

    for (const [i, id] of ids.entries()) {
      await tx
        .update(category)
        .set({ groupId: body.groupId, order: i })
        .where(and(eq(category.id, id), eq(category.userId, userId), isNull(category.deletedAt)));
    }
  });
}
