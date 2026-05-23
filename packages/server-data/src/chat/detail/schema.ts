import { z } from "@hono/zod-openapi";

import { chatMessageSchema, chatIdSchema, messageVotesSchema } from "../_shared/schema.js";

const chatIdShape = chatIdSchema.shape.chatId;

export const chatResponseSchema = z
  .object({
    id: chatIdShape,
    messages: z.array(chatMessageSchema),
    votes: messageVotesSchema,
  })
  .openapi("ChatDetail");

export type ChatResponse = z.infer<typeof chatResponseSchema>;
