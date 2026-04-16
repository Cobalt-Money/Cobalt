import { db } from "@cobalt-web/db";
import { chats, messages, parts } from "@cobalt-web/db/schema/drizzle-schema";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";

import { mapUIMessagePartsToDbParts } from "./lib.js";

export async function createChat(
  userId: string,
  title?: string
): Promise<string> {
  const chatId = crypto.randomUUID();
  await db.insert(chats).values({ chatId, title: title ?? null, userId });
  return chatId;
}

/**
 * Upsert a full UIMessage (user or assistant) into the DB.
 *
 * Uses the same transaction pattern as the reference implementation:
 *   1. Upsert the message row (insert or update on conflict)
 *   2. Delete all existing parts for that message
 *   3. Re-insert the current parts via mapUIMessagePartsToDbParts
 *   4. Touch chats.updatedAt
 */
export async function upsertMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: UIMessage;
}): Promise<void> {
  const dbParts = mapUIMessagePartsToDbParts(message.parts, message.id);

  await db.transaction(async (tx) => {
    await tx
      .insert(messages)
      .values({ chatId, messageId: message.id, role: message.role })
      .onConflictDoUpdate({
        set: { chatId, role: message.role },
        target: messages.messageId,
      });

    await tx.delete(parts).where(eq(parts.messageId, message.id));

    if (dbParts.length > 0) {
      await tx.insert(parts).values(dbParts);
    }

    await tx
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.chatId, chatId));
  });
}

export async function appendUserMessage(
  chatId: string,
  content: string
): Promise<string> {
  const messageId = crypto.randomUUID();
  await db.insert(messages).values({ chatId, messageId, role: "user" });
  await db.insert(parts).values({
    messageId,
    order: 0,
    partId: crypto.randomUUID(),
    text_text: content,
    type: "text",
  });
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.chatId, chatId));
  return messageId;
}

export async function appendAssistantMessage(
  chatId: string,
  text: string
): Promise<string> {
  const messageId = crypto.randomUUID();
  await db.insert(messages).values({ chatId, messageId, role: "assistant" });
  await db.insert(parts).values({
    messageId,
    order: 0,
    partId: crypto.randomUUID(),
    text_text: text,
    type: "text",
  });
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.chatId, chatId));
  return messageId;
}
