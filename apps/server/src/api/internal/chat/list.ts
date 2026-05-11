import { getChatsByUserId } from "@cobalt-web/server-data/chat/queries";
import { conversationListResponseSchema } from "@cobalt-web/server-data/chat/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "List the authenticated user's chats (most recently updated first).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/list",
  responses: {
    200: jsonContent(conversationListResponseSchema, "Chat list"),
  },
  summary: "List chats",
  tags: ["Chat"],
});

export const chatListRouter = createApp().openapi(route, async (c) => {
  const items = await getChatsByUserId(c.var.user.id);
  return c.json(items, 200);
});
