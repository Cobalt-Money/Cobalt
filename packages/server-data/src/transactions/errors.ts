import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/api-error.js";

export { ApiError } from "../_shared/api-error.js";

/** 404 if `accountId` is missing or owned by another user. */
export async function assertAccountOwned(accountId: string, userId: string): Promise<void> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: { id: { eq: accountId }, userId: { eq: userId } },
  });
  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
}

/** 404 if `categoryId` is missing or owned by another user. */
export async function assertCategoryOwned(categoryId: string, userId: string): Promise<void> {
  const row = await db.query.category.findFirst({
    columns: { id: true },
    where: { id: { eq: categoryId }, userId: { eq: userId } },
  });
  if (!row) {
    throw new ApiError(404, "category_not_found", "Category not found");
  }
}
