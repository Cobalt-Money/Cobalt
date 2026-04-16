import { createChat } from "@cobalt-web/server-data/chat/mutations";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { Hono } from "hono";

import { requirePaidUser } from "../middleware.js";

/** POST /api/chat — create a new empty chat, returns { chatId }. */
export const chatCreateRouter = new Hono<AppEnv>().post(
  "/",
  requirePaidUser,
  async (c) => {
    const userId = c.var.user.id;
    const chatId = await createChat(userId);
    return c.json({ chatId }, 201);
  }
);
