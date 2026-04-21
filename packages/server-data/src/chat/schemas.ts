import { messageVotes } from "@cobalt-web/db/schema/features";
import { chats, messages } from "@cobalt-web/db/schema/zero-schema";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Row bases (Drizzle → Zod) ───────────────────────────────────────

const chatsRowSchema = createSelectSchema(chats);
const messagesRowSchema = createSelectSchema(messages);
const messageVotesRowSchema = createSelectSchema(messageVotes);

// ── List item: sidebar / history (API uses `id` + ISO strings) ─────

const chatIdShape = chatsRowSchema.pick({ chatId: true }).shape.chatId;

export const conversationSchema = chatsRowSchema
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
  .omit({ chatId: true });

export const conversationListResponseSchema = z.array(conversationSchema);

// ── Message + parts (parts are assembled; not a single DB row shape) ─

const chatMessagePartSchema = z.record(z.string(), z.any());
const messageIdShape = messagesRowSchema.pick({ messageId: true }).shape
  .messageId;

export const chatMessageSchema = messagesRowSchema
  .pick({
    messageId: true,
    role: true,
  })
  .extend({
    id: messageIdShape,
    parts: z.array(chatMessagePartSchema),
  })
  .omit({ messageId: true });

// ── Votes map: messageId → vote (picked from `messageVotes.vote`) ───

export const messageVotesSchema = z.record(
  z.string(),
  messageVotesRowSchema.pick({ vote: true }).shape.vote
);

// ── Chat detail envelope ───────────────────────────────────────────

export const chatDetailResponseSchema = z.object({
  id: chatIdShape,
  messages: z.array(chatMessageSchema),
  votes: messageVotesSchema,
});

export const chatIdParamSchema = z.object({
  chatId: chatIdShape.min(1),
});

export const chatErrorResponseSchema = z.object({
  error: z.string(),
});

export const chatDeleteResponseSchema = z.object({
  chatId: chatIdShape,
  success: z.boolean(),
});

// ── Inferred DTOs (single source of truth with OpenAPI schemas above) ─

export type Conversation = z.infer<typeof conversationSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
