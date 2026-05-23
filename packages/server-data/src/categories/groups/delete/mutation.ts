import { db } from "@cobalt-web/db";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { and, eq } from "drizzle-orm";

import { CategoryMutationError } from "../../_shared/errors.js";

/**
 * Soft-delete a custom group. FK on `category.groupId` is `restrict`, so the
 * group can only be deleted once it has zero non-deleted children.
 */
export async function deleteCategoryGroup(userId: string, groupId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.categoryGroup.findFirst({
      columns: { systemKey: true },
      where: {
        deletedAt: { isNull: true },
        id: { eq: groupId },
        userId: { eq: userId },
      },
    });
    if (!existing) {
      throw new CategoryMutationError("group_not_found", "Group not found");
    }
    if (existing.systemKey !== null) {
      throw new CategoryMutationError("system_locked", "System groups cannot be deleted");
    }

    const child = await tx.query.category.findFirst({
      columns: { id: true },
      where: {
        deletedAt: { isNull: true },
        groupId: { eq: groupId },
        userId: { eq: userId },
      },
    });
    if (child) {
      throw new CategoryMutationError(
        "group_has_categories",
        "Move or delete categories before deleting the group",
      );
    }

    await tx
      .update(categoryGroup)
      .set({ deletedAt: new Date() })
      .where(and(eq(categoryGroup.id, groupId), eq(categoryGroup.userId, userId)));
  });
}
