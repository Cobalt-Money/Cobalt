import { db } from "@cobalt-web/db";
import { chats, messages, parts } from "@cobalt-web/db/schema/schema";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";

import { mapUIMessagePartsToDbParts } from "./lib.js";

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  await db.update(chats).set({ title, updatedAt: new Date() }).where(eq(chats.chatId, chatId));
}

/**
 * Upsert a full UIMessage (user or assistant) into the DB.
 *
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

    await tx.update(chats).set({ updatedAt: new Date() }).where(eq(chats.chatId, chatId));
  });
}
