import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { and, eq } from "drizzle-orm";

import { CategoryMutationError } from "../_shared/errors.js";
import type { PatchCategory } from "./schema.js";

export async function patchCategory(
  userId: string,
  categoryId: string,
  body: PatchCategory,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.category.findFirst({
      columns: { systemKey: true },
      where: {
        deletedAt: { isNull: true },
        id: { eq: categoryId },
        userId: { eq: userId },
      },
    });
    if (!existing) {
      throw new CategoryMutationError("not_found", "Category not found");
    }

    if (body.groupId !== undefined) {
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
    }

    const updates: Partial<typeof category.$inferInsert> = {};
    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.iconKey !== undefined) {
      updates.iconKey = body.iconKey;
    }
    if (body.groupId !== undefined) {
      updates.groupId = body.groupId;
    }
    if (body.hidden !== undefined) {
      updates.hidden = body.hidden;
    }
    if (body.order !== undefined) {
      updates.order = body.order;
    }
    if (body.excludeFromInsights !== undefined) {
      updates.excludeFromInsights = body.excludeFromInsights;
    }
    if (Object.keys(updates).length === 0) {
      return;
    }

    await tx
      .update(category)
      .set(updates)
      .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
  });
}
