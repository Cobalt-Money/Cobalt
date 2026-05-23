import { z } from "@hono/zod-openapi";

import { chatSchema } from "../_shared/schema.js";

export const chatsResponseSchema = z.array(chatSchema);

export type ChatsResponse = z.infer<typeof chatsResponseSchema>;
