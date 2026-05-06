import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, isNull } from "drizzle-orm";

import { getUncategorizedId } from "./lookup.js";
import type {
  CreateCategoryBody,
  CreateCategoryGroupBody,
  ReorderCategoriesBody,
  ReorderCategoryGroupsBody,
  UpdateCategoryBody,
  UpdateCategoryGroupBody,
} from "./schemas.js";

export type CategoryMutationErrorCode =
  | "not_found"
  | "system_locked"
  | "group_not_found"
  | "group_has_categories"
  | "uncategorized_missing"
  | "name_conflict";

export class CategoryMutationError extends Error {
  readonly code: CategoryMutationErrorCode;

  constructor(code: CategoryMutationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CategoryMutationError";
  }
}

export function createCategory(userId: string, body: CreateCategoryBody): Promise<{ id: string }> {
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

export async function updateCategory(
  userId: string,
  categoryId: string,
  body: UpdateCategoryBody,
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

/**
 * Soft-delete a custom category. FK is `restrict`, so reassign all dependent
 * transactions + recurring rows to the user's seeded `uncategorized` cat first,
 * then mark `deleted_at`. System cats cannot be deleted (only hidden).
 */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
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
    if (existing.systemKey !== null) {
      throw new CategoryMutationError("system_locked", "System categories cannot be deleted");
    }

    const uncategorizedId = await getUncategorizedId(userId);
    if (!uncategorizedId) {
      throw new CategoryMutationError(
        "uncategorized_missing",
        "Uncategorized seed row missing for user",
      );
    }
    if (uncategorizedId === categoryId) {
      throw new CategoryMutationError("system_locked", "Cannot delete uncategorized");
    }

    await tx
      .update(transaction)
      .set({ categoryId: uncategorizedId })
      .where(and(eq(transaction.userId, userId), eq(transaction.categoryId, categoryId)));

    await tx
      .update(recurring)
      .set({ categoryId: uncategorizedId })
      .where(and(eq(recurring.userId, userId), eq(recurring.categoryId, categoryId)));

    await tx
      .update(category)
      .set({ deletedAt: new Date() })
      .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
  });
}

export async function reorderCategories(
  userId: string,
  body: ReorderCategoriesBody,
): Promise<void> {
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

export async function createCategoryGroup(
  userId: string,
  body: CreateCategoryGroupBody,
): Promise<{ id: string }> {
  const siblings = await db.query.categoryGroup.findMany({
    columns: { order: true },
    where: { deletedAt: { isNull: true }, userId: { eq: userId } },
  });
  let maxOrder = -1;
  for (const s of siblings) {
    if (s.order > maxOrder) {
      maxOrder = s.order;
    }
  }
  const nextOrder = maxOrder + 1;

  const [row] = await db
    .insert(categoryGroup)
    .values({
      name: body.name,
      order: nextOrder,
      systemKey: null,
      userId,
    })
    .returning({ id: categoryGroup.id });
  if (!row) {
    throw new Error("Failed to create group");
  }
  return { id: row.id };
}

export async function updateCategoryGroup(
  userId: string,
  groupId: string,
  body: UpdateCategoryGroupBody,
): Promise<void> {
  const updates: Partial<typeof categoryGroup.$inferInsert> = {};
  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.order !== undefined) {
    updates.order = body.order;
  }
  if (Object.keys(updates).length === 0) {
    return;
  }

  await db
    .update(categoryGroup)
    .set(updates)
    .where(and(eq(categoryGroup.id, groupId), eq(categoryGroup.userId, userId)));
}

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

export async function reorderCategoryGroups(
  userId: string,
  body: ReorderCategoryGroupsBody,
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
