import { db } from "@cobalt-web/db";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { and, eq } from "drizzle-orm";

import type { PatchCategoryGroup } from "./schema.js";

export async function patchCategoryGroup(
  userId: string,
  groupId: string,
  body: PatchCategoryGroup,
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
