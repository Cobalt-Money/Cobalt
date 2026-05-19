import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import { NO_MATCH_ID } from "../auth.js";
import type { Context } from "../auth.js";
import { zql } from "../schema.js";

const listArgs = z.object({ includeHidden: z.boolean().optional() }).optional();

/** Category named queries (`queries.categories.*`). */
export const categoriesQueries = {
  /** Non-deleted categories. Pass `{ includeHidden: true }` to include hidden (settings view). */
  list: defineQuery(listArgs, ({ args, ctx }: { args: z.infer<typeof listArgs>; ctx: Context }) => {
    const q = zql.category
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("deletedAt", "IS", null)
      .related("group")
      .orderBy("order", "asc");
    return args?.includeHidden ? q : q.where("hidden", false);
  }),

  /** All non-deleted groups for current user. */
  listGroups: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.categoryGroup
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("deletedAt", "IS", null)
      .orderBy("order", "asc"),
  ),
};
