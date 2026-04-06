import { db } from "@cobalt-web/db";
import { chats } from "@cobalt-web/db/schema/ai/chat";
import { eq } from "drizzle-orm";

/**
 * Updates the title of a chat conversation.
 * Returns true if the chat was found and updated.
 */
export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<{ success: boolean; updated: boolean }> {
  const result = await db
    .update(chats)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(eq(chats.chatId, chatId));

  return {
    success: true,
    updated: (result.rowCount ?? 0) > 0,
  };
}
