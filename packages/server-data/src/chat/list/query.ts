import { db } from "@cobalt-web/db";

import type { Chat } from "../_shared/schema.js";

export async function getChats(userId: string): Promise<Chat[]> {
  const items = await db.query.chats.findMany({
    orderBy: { updatedAt: "desc" },
    where: { userId: { eq: userId } },
  });

  return items.map((chat) => ({
    createdAt: chat.createdAt?.toISOString() ?? new Date().toISOString(),
    id: chat.chatId,
    title: chat.title || chat.chatId,
    updatedAt:
      chat.updatedAt?.toISOString() ?? chat.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}
