import type { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import type { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";

import type { CategoryGroupResponse, CategoryResponse } from "./schema.js";

export function toCategoryDto(row: typeof category.$inferSelect): CategoryResponse {
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

export function toCategoryGroupDto(row: typeof categoryGroup.$inferSelect): CategoryGroupResponse {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    order: row.order,
    systemKey: row.systemKey,
    updatedAt: row.updatedAt.toISOString(),
  };
}
