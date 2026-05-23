import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { chatIdSchema, successResponseSchema } from "@cobalt-web/server-data/chat/_shared";
import { deleteChat } from "@cobalt-web/server-data/chat/delete";
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
  request: { params: chatIdSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Chat deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Chat not found"),
    422: validationErrorResponse(chatIdSchema),
  },
  summary: "Delete chat",
  tags: ["Chat"],
});

export const chatDeleteRouter = createApp().openapi(route, async (c) => {
  const { chatId } = c.req.valid("param");
  const userId = c.var.user.id;

  await deleteChat(userId, chatId);
  return c.json(successResponseSchema.parse({ success: true }), 200);
});
