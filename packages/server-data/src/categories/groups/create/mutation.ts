import { db } from "@cobalt-web/db";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";

import type { CreateCategoryGroup } from "./schema.js";

export async function createCategoryGroup(
  userId: string,
  body: CreateCategoryGroup,
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
