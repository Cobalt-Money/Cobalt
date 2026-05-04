import { getChatsByUserId } from "@cobalt-web/server-data/chat/queries";
import {
  chatErrorResponseSchema,
  conversationListResponseSchema,
} from "@cobalt-web/server-data/chat/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "List the authenticated user's chats (most recently updated first).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/list",
  responses: {
    200: {
      content: {
        "application/json": { schema: conversationListResponseSchema },
      },
      description: "Chat list",
    },
    500: {
      content: {
        "application/json": { schema: chatErrorResponseSchema },
      },
      description: "Server error",
    },
  },
  summary: "List chats",
  tags: ["Chat"],
});

export const chatListRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  try {
    const items = await getChatsByUserId(c.var.user.id);
    return c.json(items, 200);
  } catch {
    return c.json({ error: "Failed to fetch chats" }, 500);
  }
});
