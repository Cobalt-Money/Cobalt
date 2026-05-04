import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";

const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

/** Category named queries (`queries.categories.*`). */
export const categoriesQueries = {
  /** All non-deleted cats for the current user, grouped via the parent. */
  list: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.category.where("id", NO_MATCH_ID);
    }
    return zql.category
      .where("userId", userId)
      .where("deletedAt", "IS", null)
      .where("hidden", false)
      .related("group")
      .orderBy("order", "asc");
  }),
};
