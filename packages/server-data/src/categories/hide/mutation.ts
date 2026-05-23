import { db } from "@cobalt-web/db";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq } from "drizzle-orm";

import { CategoryMutationError } from "../_shared/errors.js";
import type { HideCategory } from "./schema.js";

/**
 * Hide a category. Optionally reassign tx + recurring rows to `reassignTo`
 * before flipping `hidden=true`. Both system + custom cats can be hidden.
 * `reassignTo === undefined | null` skips reassign (caller chose "keep assigned").
 */
export async function hideCategory(
  userId: string,
  categoryId: string,
  body: HideCategory,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.category.findFirst({
      columns: { id: true },
      where: {
        deletedAt: { isNull: true },
        id: { eq: categoryId },
        userId: { eq: userId },
      },
    });
    if (!existing) {
      throw new CategoryMutationError("not_found", "Category not found");
    }

    if (body.reassignTo) {
      if (body.reassignTo === categoryId) {
        throw new CategoryMutationError(
          "reassign_target_invalid",
          "Reassign target cannot be the same category",
        );
      }
      const target = await tx.query.category.findFirst({
        columns: { id: true },
        where: {
          deletedAt: { isNull: true },
          id: { eq: body.reassignTo },
          userId: { eq: userId },
        },
      });
      if (!target) {
        throw new CategoryMutationError("reassign_target_invalid", "Reassign target not found");
      }

      await tx
        .update(transaction)
        .set({ categoryId: body.reassignTo })
        .where(and(eq(transaction.userId, userId), eq(transaction.categoryId, categoryId)));

      await tx
        .update(recurring)
        .set({ categoryId: body.reassignTo })
        .where(and(eq(recurring.userId, userId), eq(recurring.categoryId, categoryId)));
    }

    await tx
      .update(category)
      .set({ hidden: true })
      .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
  });
}
