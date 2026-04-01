import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { chatsForUser, NO_MATCH_ID } from "./lib.js";

/** Chat-related named queries (`queries.chats.*`). Composed in root `queries.ts`. */
export const chatsQueries = {
  list: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.chats.where("chatId", NO_MATCH_ID);
    }
    return chatsForUser(userId);
  }),
};
