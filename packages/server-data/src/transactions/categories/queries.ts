import { db } from "@cobalt-web/db";
import type { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import type { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";

import type { CategoryDto, CategoryGroupDto } from "./schemas.js";

function toCategoryDto(row: typeof category.$inferSelect): CategoryDto {
  return {
    createdAt: row.createdAt.toISOString(),
    excludeFromInsights: row.excludeFromInsights,
    groupId: row.groupId,
    hidden: row.hidden,
    iconKey: row.iconKey,
    id: row.id,
    name: row.name,
    order: row.order,
    systemKey: row.systemKey,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toGroupDto(row: typeof categoryGroup.$inferSelect): CategoryGroupDto {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    order: row.order,
    systemKey: row.systemKey,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCategories(
  userId: string,
): Promise<{ categories: CategoryDto[]; groups: CategoryGroupDto[] }> {
  const [cats, groups] = await Promise.all([
    db.query.category.findMany({
      orderBy: { name: "asc", order: "asc" },
      where: { deletedAt: { isNull: true }, userId: { eq: userId } },
    }),
    db.query.categoryGroup.findMany({
      orderBy: { name: "asc", order: "asc" },
      where: { deletedAt: { isNull: true }, userId: { eq: userId } },
    }),
  ]);

  return {
    categories: cats.map(toCategoryDto),
    groups: groups.map(toGroupDto),
  };
}

export async function getCategory(userId: string, categoryId: string): Promise<CategoryDto | null> {
  const row = await db.query.category.findFirst({
    where: {
      deletedAt: { isNull: true },
      id: { eq: categoryId },
      userId: { eq: userId },
    },
  });
  return row ? toCategoryDto(row) : null;
}

export async function getCategoryGroup(
  userId: string,
  groupId: string,
): Promise<CategoryGroupDto | null> {
  const row = await db.query.categoryGroup.findFirst({
    where: {
      deletedAt: { isNull: true },
      id: { eq: groupId },
      userId: { eq: userId },
    },
  });
  return row ? toGroupDto(row) : null;
}
