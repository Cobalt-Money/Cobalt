import { messageVotes } from "@cobalt-web/db/schema/ai/message-votes";
import { chats, messages } from "@cobalt-web/db/schema/zero-schema";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Row bases (Drizzle → Zod) ───────────────────────────────────────

const chatsRowSchema = createSelectSchema(chats);
const messagesRowSchema = createSelectSchema(messages);
const messageVotesRowSchema = createSelectSchema(messageVotes);

const chatIdShape = chatsRowSchema.pick({ chatId: true }).shape.chatId;
const messageIdShape = messagesRowSchema.pick({ messageId: true }).shape.messageId;

// ── Path params ─────────────────────────────────────────────────────

export const chatIdSchema = z.object({
  chatId: chatIdShape.min(1),
});

// ── Generic responses ───────────────────────────────────────────────

export const successResponseSchema = z.object({ success: z.boolean() });

// ── Chat resource (single row, sidebar / list item) ─────────────────

export const chatSchema = chatsRowSchema
  .pick({
    chatId: true,
    createdAt: true,
    title: true,
    updatedAt: true,
  })
  .extend({
    createdAt: z.string(),
    id: chatIdShape,
    title: z.string(),
    updatedAt: z.string(),
  })
  .omit({ chatId: true })
  .openapi("Chat");

export type Chat = z.infer<typeof chatSchema>;

// ── Message + parts (parts are assembled; not a single DB row shape) ─

const chatMessagePartSchema = z.record(z.string(), z.any());

export const chatMessageSchema = messagesRowSchema
  .pick({
    messageId: true,
    role: true,
  })
  .extend({
    id: messageIdShape,
    parts: z.array(chatMessagePartSchema),
  })
  .omit({ messageId: true })
  .openapi("ChatMessage");

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// ── Votes map: messageId → vote ─────────────────────────────────────

export const messageVotesSchema = z.record(
  z.string(),
  messageVotesRowSchema.pick({ vote: true }).shape.vote,
);
