import { db } from "@cobalt-web/db";
import { env } from "@cobalt-web/env/server";
import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { upsertMessage } from "@cobalt-web/server-data/chat/mutations";
import type { AppEnv } from "@cobalt-web/server-data/types";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  pruneMessages,
} from "ai";
import type { UIMessage } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { start } from "workflow/api";

import { createFinanceAgent } from "../../../ai/agents/finance-agent/finance-agent.js";
import { parseModelWithReasoning } from "../../../ai/model-provider.js";
import type { ReasoningEffort } from "../../../ai/model-provider.js";
import { generateChatTitleWorkflow } from "../../../workflows/chat-title/workflow.js";
import { requirePaidUser } from "../middleware.js";

const MAX_HISTORY = 20;

function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (p): p is { text: string; type: "text" } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}

async function startChatTitle(
  chatTitle: string | null,
  chatId: string,
  message: UIMessage,
): Promise<void> {
  if (chatTitle || message.role !== "user") {
    return;
  }
  const firstMessage = extractMessageText(message);
  if (!firstMessage) {
    return;
  }
  try {
    await start(generateChatTitleWorkflow, [{ chatId, firstMessage }]);
  } catch (error) {
    console.error("[chat-title] failed to start workflow", error);
  }
}

/**
 * SSE streaming endpoint. Preconditions (config, body shape, ownership) are
 * checked BEFORE the stream starts and surface as JSON errors with stable codes.
 * Once the stream begins, errors are delivered as SSE events via the AI SDK's
 * `onError` hook — HTTP status cannot change after headers are flushed.
 */
export const chatStreamRouter = new Hono<AppEnv>()
  // biome-ignore lint/suspicious/useAwait: hono onError callback signature
  // oxlint-disable-next-line prefer-await-to-callbacks
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    if (err instanceof ApiError) {
      return c.json({ code: err.code, error: err.message }, err.status as ContentfulStatusCode);
    }
    console.error("[chat-stream error]", { method: c.req.method, path: c.req.path }, err);
    return c.json({ error: "Internal server error" }, 500);
  })
  .post("/:chatId/stream", requirePaidUser, async (c) => {
    if (!env.AI_GATEWAY_API_KEY) {
      throw new ApiError(503, "ai_not_configured", "AI provider is not configured");
    }

    const chatId = c.req.param("chatId");
    const userId = c.var.user.id;

    const body = await c.req.json<{
      effort?: ReasoningEffort;
      message?: UIMessage;
      messages?: UIMessage[];
      model?: string;
    }>();

    const { effort = "high", message, messages, model } = body ?? {};

    if (!message?.id || !message.parts?.length) {
      throw new ApiError(400, "message_required", "message is required");
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ApiError(400, "messages_required", "messages history is required");
    }

    const chat = await db.query.chats.findFirst({
      where: { chatId: { eq: chatId }, userId: { eq: userId } },
    });
    if (!chat) {
      // Single neutral code — never differentiate missing vs unowned.
      throw new ApiError(404, "chat_not_found", "Chat not found");
    }

    const { baseModel: loggedBaseModel, useReasoning: loggedUseReasoning } =
      parseModelWithReasoning(model ?? env.AI_GATEWAY_MODEL ?? "(default)");
    console.log("[chat-stream]", {
      chatId,
      effort: loggedUseReasoning ? effort : undefined,
      model: loggedBaseModel,
      reasoning: loggedUseReasoning,
      userId,
    });

    await upsertMessage({ chatId, message });
    await startChatTitle(chat.title, chatId, message);

    const allModelMessages = await convertToModelMessages(messages);
    const trimmed =
      allModelMessages.length > MAX_HISTORY
        ? allModelMessages.slice(-MAX_HISTORY)
        : allModelMessages;

    const now = new Date();
    const currentDate = now.toLocaleDateString("en-CA");
    const currentDateFormatted = now.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    });

    const modelMessages = pruneMessages({
      messages: trimmed,
      reasoning: "all",
      toolCalls: [
        {
          tools: [
            "bash",
            "executeCode",
            "webSearch",
            "webExtract",
            "renderChart",
            "renderDocument",
          ],
          type: "all",
        },
      ],
    });

    const financeAgent = await createFinanceAgent(model, userId, effort);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          const result = await financeAgent.stream({
            messages: modelMessages,
            options: { currentDate, currentDateFormatted },
          });
          const uiStream = result.toUIMessageStream({ sendReasoning: true });
          for await (const chunk of uiStream) {
            writer.write(chunk as Parameters<typeof writer.write>[0]);
          }
        } catch (error) {
          // Wrap upstream AI provider errors with a stable code so the
          // SSE `onError` callback below can surface "ai_upstream_failed".
          throw new ApiError(
            502,
            "ai_upstream_failed",
            error instanceof Error ? error.message : "AI provider failed",
          );
        }
      },
      onError: (error) => {
        console.error("[chat stream error]", error);
        if (error instanceof ApiError) {
          return `${error.code}: ${error.message}`;
        }
        return error instanceof Error ? error.message : "Stream error";
      },
      onFinish: async ({ responseMessage }) => {
        const assistantMessage = responseMessage as UIMessage;
        await upsertMessage({ chatId, message: assistantMessage });
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({ stream });
  });
