import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { deleteChat } from "@cobalt-web/server-data/chat/mutations";
import { chatDeleteResponseSchema, chatIdParamSchema } from "@cobalt-web/server-data/chat/schemas";
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
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Chat not found"),
    422: validationErrorResponse(chatIdParamSchema),
  },
  summary: "Delete chat",
  tags: ["Chat"],
});

export const chatDeleteRouter = createApp().openapi(route, async (c) => {
  const { chatId } = c.req.valid("param");
  const userId = c.var.user.id;

  await deleteChat(userId, chatId);
  return c.json({ chatId, success: true }, 200);
});
