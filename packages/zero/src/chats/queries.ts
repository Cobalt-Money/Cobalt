import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { chatsForUser, NO_MATCH_ID } from "./lib.js";

/** Chat-related named queries (`queries.chats.*`). Composed in root `queries.ts`. */
export const chatsQueries = {
  /** Single chat row for the signed-in user (empty when id unknown or other user). */
  chatById: defineQuery(z.object({ chatId: z.string() }), ({ ctx, args }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.chats.where("chatId", NO_MATCH_ID);
    }
    return zql.chats.where("chatId", args.chatId).where("userId", userId);
  }),

  list: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.chats.where("chatId", NO_MATCH_ID);
    }
    return chatsForUser(userId);
  }),

  messages: defineQuery(z.object({ chatId: z.string() }), ({ args }) =>
    zql.messages
      .where("chatId", args.chatId)
      .related("parts", (q) => q.orderBy("order", "asc"))
      .orderBy("createdAt", "asc"),
  ),
};
