import { db } from "@cobalt-web/db";
import { chats } from "@cobalt-web/db/schema/schema";

export async function createChat(userId: string, title?: string): Promise<string> {
  const [row] = await db
    .insert(chats)
    .values({ title: title ?? null, userId })
    .returning({ chatId: chats.chatId });
  if (!row) {
    throw new Error("Failed to create chat");
  }
  return row.chatId;
}
