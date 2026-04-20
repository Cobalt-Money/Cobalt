import { deleteChat } from "@cobalt-web/server-data/chat/mutations";
import {
  chatDeleteResponseSchema,
  chatErrorResponseSchema,
  chatIdParamSchema,
} from "@cobalt-web/server-data/chat/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Permanently delete a chat owned by the authenticated user. Cascades to messages and parts. REST endpoint for mobile clients; web uses the Zero `chats.delete` mutator.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{chatId}",
  request: { params: chatIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: chatDeleteResponseSchema },
      },
      description: "Chat deleted",
    },
    404: {
      content: {
        "application/json": { schema: chatErrorResponseSchema },
      },
      description: "Chat not found or not owned by the caller",
    },
  },
  summary: "Delete chat",
  tags: ["Chat"],
});

export const chatDeleteRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { chatId } = c.req.valid("param");
    const userId = c.var.user.id;

    const deleted = await deleteChat(userId, chatId);
    if (!deleted) {
      return c.json({ error: "Chat not found" }, 404);
    }
    return c.json({ chatId, success: true }, 200);
  }
);
