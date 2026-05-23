import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { chatIdSchema } from "@cobalt-web/server-data/chat/_shared";
import { chatResponseSchema, getChatDetail } from "@cobalt-web/server-data/chat/detail";
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
  request: { params: chatIdSchema },
  responses: {
    200: jsonContent(chatResponseSchema, "Chat detail"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(chatResponseSchema, "Not found — empty messages"),
    422: validationErrorResponse(chatIdSchema),
  },
  summary: "Get chat messages",
  tags: ["Chat"],
});

export const chatDetailRouter = createApp().openapi(route, async (c) => {
  const { chatId } = c.req.valid("param");
  const userId = c.var.user.id;

  try {
    const result = await getChatDetail(userId, chatId);
    return c.json(chatResponseSchema.parse(result), 200);
  } catch (error) {
    // Preserve legacy client behavior: missing/unowned chat → 404 with empty envelope.
    // Other errors bubble to the central onError handler.
    if (error instanceof ApiError && error.code === "chat_not_found") {
      return c.json(chatResponseSchema.parse({ id: chatId, messages: [], votes: {} }), 404);
    }
    throw error;
  }
});
