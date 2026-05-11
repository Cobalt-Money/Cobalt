import { getChatMessagesForUser, getVotesForChat } from "@cobalt-web/server-data/chat/queries";
import {
  chatDetailResponseSchema,
  chatErrorResponseSchema,
  chatIdParamSchema,
} from "@cobalt-web/server-data/chat/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Load messages and vote map for one chat. Returns 404 with empty messages when the chat is missing or inaccessible (matches legacy client behavior).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{chatId}",
  request: { params: chatIdParamSchema },
  responses: {
    200: jsonContent(chatDetailResponseSchema, "Chat detail"),
    404: jsonContent(chatDetailResponseSchema, "Not found — empty messages"),
    422: validationErrorResponse(chatIdParamSchema),
    500: jsonContent(chatErrorResponseSchema, "Server error"),
  },
  summary: "Get chat messages",
  tags: ["Chat"],
});

export const chatDetailRouter = createApp().openapi(route, async (c) => {
  const { chatId } = c.req.valid("param");
  const userId = c.var.user.id;

  try {
    const [messages, votes] = await Promise.all([
      getChatMessagesForUser(userId, chatId),
      getVotesForChat(userId, chatId),
    ]);
    return c.json({ id: chatId, messages, votes }, 200);
  } catch {
    return c.json({ id: chatId, messages: [], votes: {} }, 404);
  }
});
