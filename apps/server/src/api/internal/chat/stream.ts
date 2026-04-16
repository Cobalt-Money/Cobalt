import { createGateway } from "@ai-sdk/gateway";
import { db } from "@cobalt-web/db";
import { env } from "@cobalt-web/env/server";
import { upsertMessage } from "@cobalt-web/server-data/chat/mutations";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { convertToModelMessages, pruneMessages, streamText } from "ai";
import type { UIMessage } from "ai";
import { Hono } from "hono";

import { requirePaidUser } from "../middleware.js";

const SYSTEM_PROMPT = [
  "You are Cobalt, a personal financial AI assistant.",
  "You help users understand their finances, spending, investments, and financial goals.",
  "Be concise, clear, and actionable.",
].join(" ");

/** Max messages kept in context (trims oldest first). */
const MAX_HISTORY = 20;

/**
 * POST /api/chat/:chatId/stream
 *
 * Body: { message: UIMessage; messages: UIMessage[] }
 *
 * Flow:
 *  1. upsertMessage(user) → DB write → Zero syncs it to the client
 *  2. convertToModelMessages → pruneMessages → streamText
 *  3. toUIMessageStreamResponse() — client reads SSE tokens
 *  4. onFinish({ text }) → upsertMessage(assistant) → Zero syncs final message
 */
export const chatStreamRouter = new Hono<AppEnv>().post(
  "/:chatId/stream",
  requirePaidUser,
  async (c) => {
    if (!env.AI_GATEWAY_API_KEY) {
      return c.json({ error: "AI not configured" }, 503);
    }

    const chatId = c.req.param("chatId");
    const userId = c.var.user.id;

    const body = await c.req.json<{
      message?: UIMessage;
      messages?: UIMessage[];
    }>();

    const { message, messages } = body ?? {};

    if (!message?.id || !message.parts?.length) {
      return c.json({ error: "message is required" }, 400);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages history is required" }, 400);
    }

    // Verify the user owns this chat
    const chat = await db.query.chats.findFirst({
      where: { chatId: { eq: chatId }, userId: { eq: userId } },
    });
    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    // 1. Persist user message — Zero syncs before first token arrives
    await upsertMessage({ chatId, message });

    // 2. Convert full UIMessage[] → ModelMessage[] and trim context window
    const allModelMessages = await convertToModelMessages(messages);
    const trimmed =
      allModelMessages.length > MAX_HISTORY
        ? allModelMessages.slice(-MAX_HISTORY)
        : allModelMessages;
    const modelMessages = pruneMessages({
      messages: trimmed,
      reasoning: "all",
    });

    // 3. Stream via Vercel AI Gateway.
    const gatewayProvider = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
    const assistantMessageId = crypto.randomUUID();
    const result = streamText({
      messages: modelMessages,
      model: gatewayProvider(env.AI_GATEWAY_MODEL),
      onFinish: async ({ text }) => {
        const assistantMessage: UIMessage = {
          id: assistantMessageId,
          parts: [{ text, type: "text" }],
          role: "assistant",
        };
        await upsertMessage({ chatId, message: assistantMessage });
      },
      system: SYSTEM_PROMPT,
    });

    return result.toUIMessageStreamResponse();
  }
);
