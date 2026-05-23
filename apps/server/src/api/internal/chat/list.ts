import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { chatsResponseSchema, getChats } from "@cobalt-web/server-data/chat/list";
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
    200: jsonContent(chatsResponseSchema, "Chat list"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List chats",
  tags: ["Chat"],
});

export const chatListRouter = createApp().openapi(route, async (c) => {
  const items = await getChats(c.var.user.id);
  return c.json(chatsResponseSchema.parse(items), 200);
});
