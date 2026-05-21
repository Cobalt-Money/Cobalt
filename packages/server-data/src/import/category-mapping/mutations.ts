import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";

import { ApiError } from "../../_shared/api-error";

/**
 * Look up (or create) the user's seeded `uncategorized` system category.
 * Used by Step 4 (skip fallback) and the commit workflow when a row's
 * source label has no resolution.
 */
export async function ensureUncategorizedCategory(userId: string): Promise<string> {
  const existing = await db.query.category.findFirst({
    columns: { id: true },
    where: { systemKey: { eq: "uncategorized" }, userId: { eq: userId } },
  });
  if (existing) {
    return existing.id;
  }
  // Cold-start fallback — user predates the systemKey seed. Create on the fly.
  const group = await db.query.categoryGroup.findFirst({
    columns: { id: true },
    where: { userId: { eq: userId } },
  });
  if (!group) {
    throw new ApiError(
      409,
      "category_groups_missing",
      "Cannot seed uncategorized category — no category groups exist for user",
    );
  }
  const [created] = await db
    .insert(category)
    .values({
      groupId: group.id,
      iconKey: "circle-help",
      name: "Uncategorized",
      systemKey: "uncategorized",
      userId,
    })
    .returning({ id: category.id });
  if (!created) {
    throw new ApiError(500, "category_create_failed", "Failed to create uncategorized category");
  }
  return created.id;
}
