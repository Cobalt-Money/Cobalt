import { db } from "@cobalt-web/db";

import { toCategoryDto, toCategoryGroupDto } from "../_shared/map.js";
import type { CategoriesResponse } from "./schema.js";

export async function getCategories(userId: string): Promise<CategoriesResponse> {
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
    groups: groups.map(toCategoryGroupDto),
  };
}
