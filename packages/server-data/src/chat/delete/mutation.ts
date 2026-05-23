import { db } from "@cobalt-web/db";
import { chats } from "@cobalt-web/db/schema/schema";
import { and, eq } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";

/**
 * Delete a chat owned by `userId`. Throws `ApiError(404, "chat_not_found")`
 * if the chat is missing or not owned by the caller (single neutral message
 * to prevent enumeration). Messages and parts cascade via Postgres foreign keys.
 *
 * Used by the REST endpoint (mobile clients). The web app deletes through
 * the Zero `chats.delete` mutator for optimistic UX; both paths ultimately
 * remove the same row and benefit from the same FK cascade.
 */
export async function deleteChat(userId: string, chatId: string): Promise<void> {
  const deleted = await db
    .delete(chats)
    .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId)))
    .returning({ chatId: chats.chatId });
  if (deleted.length === 0) {
    throw new ApiError(404, "chat_not_found", "Chat not found");
  }
}
