import {
  getChatMessagesForUser,
  getVotesForChat,
} from "@cobalt-web/server-data/chat/queries";
import {
  chatDetailResponseSchema,
  chatErrorResponseSchema,
  chatIdParamSchema,
} from "@cobalt-web/server-data/chat/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Load messages and vote map for one chat. Returns 404 with empty messages when the chat is missing or inaccessible (matches legacy client behavior).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{chatId}",
  request: { params: chatIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: chatDetailResponseSchema },
      },
      description: "Chat detail",
    },
    404: {
      content: {
        "application/json": { schema: chatDetailResponseSchema },
      },
      description: "Not found — empty messages",
    },
    500: {
      content: {
        "application/json": { schema: chatErrorResponseSchema },
      },
      description: "Server error",
    },
  },
  summary: "Get chat messages",
  tags: ["Chat"],
});

export const chatDetailRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
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
  }
);
