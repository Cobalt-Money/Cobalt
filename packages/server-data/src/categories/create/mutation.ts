import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";

import { CategoryMutationError } from "../_shared/errors.js";
import type { CreateCategory } from "./schema.js";

export function createCategory(userId: string, body: CreateCategory): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
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

    const siblings = await tx.query.category.findMany({
      columns: { order: true },
      where: {
        deletedAt: { isNull: true },
        groupId: { eq: body.groupId },
        userId: { eq: userId },
      },
    });
    let maxOrder = -1;
    for (const s of siblings) {
      if (s.order > maxOrder) {
        maxOrder = s.order;
      }
    }
    const nextOrder = maxOrder + 1;

    const [row] = await tx
      .insert(category)
      .values({
        excludeFromInsights: body.excludeFromInsights ?? false,
        groupId: body.groupId,
        hidden: false,
        iconKey: body.iconKey,
        name: body.name,
        order: nextOrder,
        systemKey: null,
        userId,
      })
      .returning({ id: category.id });
    if (!row) {
      throw new Error("Failed to create category");
    }
    return { id: row.id };
  });
}
