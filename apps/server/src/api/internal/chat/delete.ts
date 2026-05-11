import { deleteChat } from "@cobalt-web/server-data/chat/mutations";
import {
  chatDeleteResponseSchema,
  chatErrorResponseSchema,
  chatIdParamSchema,
} from "@cobalt-web/server-data/chat/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Permanently delete a chat owned by the authenticated user. Cascades to messages and parts. REST endpoint for mobile clients; web uses the Zero `chats.delete` mutator.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{chatId}",
  request: { params: chatIdParamSchema },
  responses: {
    200: jsonContent(chatDeleteResponseSchema, "Chat deleted"),
    404: jsonContent(chatErrorResponseSchema, "Chat not found or not owned by the caller"),
    422: validationErrorResponse(chatIdParamSchema),
  },
  summary: "Delete chat",
  tags: ["Chat"],
});

export const chatDeleteRouter = createApp().openapi(route, async (c) => {
  const { chatId } = c.req.valid("param");
  const userId = c.var.user.id;

  const deleted = await deleteChat(userId, chatId);
  if (!deleted) {
    return c.json({ error: "Chat not found" }, 404);
  }
  return c.json({ chatId, success: true }, 200);
});
