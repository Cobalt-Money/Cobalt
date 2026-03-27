import { db } from "@cobalt-web/db";

import { partDbToUi } from "./lib.js";
import type { ChatMessage, Conversation } from "./schemas.js";

export async function getChatsByUserId(
  userId: string
): Promise<Conversation[]> {
  const items = await db.query.chats.findMany({
    orderBy: { updatedAt: "desc" },
    where: { userId: { eq: userId } },
  });

  return items.map((chat) => ({
    createdAt: chat.createdAt?.toISOString() ?? new Date().toISOString(),
    id: chat.chatId,
    title: chat.title || chat.chatId,
    updatedAt:
      chat.updatedAt?.toISOString() ??
      chat.createdAt?.toISOString() ??
      new Date().toISOString(),
  }));
}

export async function getChatMessagesForUser(
  userId: string,
  chatId: string
): Promise<ChatMessage[]> {
  const row = await db.query.chats.findFirst({
    where: {
      chatId: { eq: chatId },
      userId: { eq: userId },
    },
    with: {
      messages: {
        orderBy: { createdAt: "asc" },
        with: {
          parts: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!row) {
    throw new Error("Chat not found or access denied");
  }

  return row.messages.map((msg) => ({
    id: msg.messageId,
    parts: msg.parts
      .map(partDbToUi)
      .filter((p): p is Record<string, unknown> => p !== null),
    role: msg.role,
  }));
}

export async function getVotesForChat(
  userId: string,
  chatId: string
): Promise<Record<string, "positive" | "negative">> {
  const rows = await db.query.messageVotes.findMany({
    where: {
      message: {
        chatId: { eq: chatId },
      },
      userId: { eq: userId },
    },
  });

  const voteMap: Record<string, "positive" | "negative"> = {};
  for (const v of rows) {
    voteMap[v.messageId] = v.vote;
  }
  return voteMap;
}
