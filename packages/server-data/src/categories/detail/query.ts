import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/errors.js";
import { toCategoryDto } from "../_shared/map.js";
import type { CategoryResponse } from "../_shared/schema.js";

export async function getCategoryDetail(
  userId: string,
  categoryId: string,
): Promise<CategoryResponse> {
  const row = await db.query.category.findFirst({
    where: {
      deletedAt: { isNull: true },
      id: { eq: categoryId },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "category_not_found", "Category not found");
  }
  return toCategoryDto(row);
}
