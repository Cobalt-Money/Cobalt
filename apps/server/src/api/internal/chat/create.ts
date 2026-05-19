import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createChat } from "@cobalt-web/server-data/chat/mutations";
import { chatIdParamSchema } from "@cobalt-web/server-data/chat/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Create a new empty chat owned by the authenticated user.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/",
  responses: {
    201: jsonContent(chatIdParamSchema, "Chat created"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Create chat",
  tags: ["Chat"],
});

/** POST /api/chat — create a new empty chat, returns { chatId }. */
export const chatCreateRouter = createApp().openapi(route, async (c) => {
  const userId = c.var.user.id;
  const chatId = await createChat(userId);
  return c.json({ chatId }, 201);
});
