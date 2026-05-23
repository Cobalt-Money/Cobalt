import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq } from "drizzle-orm";

import { getUncategorizedId } from "../lookup.js";
import { CategoryMutationError } from "../_shared/errors.js";

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
