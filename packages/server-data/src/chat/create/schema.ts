import { z } from "@hono/zod-openapi";

import { chatIdSchema } from "../_shared/schema.js";

export const createChatResponseSchema = z
  .object({
    chatId: chatIdSchema.shape.chatId,
  })
  .openapi("CreateChatResponse");

export type CreateChatResponse = z.infer<typeof createChatResponseSchema>;
