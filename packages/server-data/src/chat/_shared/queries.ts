import { db } from "@cobalt-web/db";

import { ApiError } from "./errors.js";

/**
 * Fetch a chat by id, scoped to the owning user. Throws `ApiError(404, "chat_not_found")`
 * if the chat is missing or unowned (single neutral message to prevent enumeration).
 */
export async function getChat(
  userId: string,
  chatId: string,
): Promise<{ chatId: string; title: string | null }> {
  const chat = await db.query.chats.findFirst({
    where: { chatId: { eq: chatId }, userId: { eq: userId } },
  });
  if (!chat) {
    throw new ApiError(404, "chat_not_found", "Chat not found");
  }
  return { chatId: chat.chatId, title: chat.title };
}
