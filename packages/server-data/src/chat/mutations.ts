import { db } from "@cobalt-web/db";
import { chats, messages, parts } from "@cobalt-web/db/schema/schema";
import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";

import { mapUIMessagePartsToDbParts } from "./lib.js";

export async function createChat(
  userId: string,
  title?: string
): Promise<string> {
  const chatId = crypto.randomUUID();
  await db.insert(chats).values({ chatId, title: title ?? null, userId });
  return chatId;
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<void> {
  await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(eq(chats.chatId, chatId));
}

/**
 * Delete a chat owned by `userId`. Returns `true` if a row was deleted.
 * Messages and parts cascade via Postgres foreign keys.
 *
 * Used by the REST endpoint (mobile clients). The web app deletes through
 * the Zero `chats.delete` mutator for optimistic UX; both paths ultimately
 * remove the same row and benefit from the same FK cascade.
 */
export async function deleteChat(
  userId: string,
  chatId: string
): Promise<boolean> {
  const deleted = await db
    .delete(chats)
    .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId)))
    .returning({ chatId: chats.chatId });
  return deleted.length > 0;
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
