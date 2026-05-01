import { db } from "@cobalt-web/db";
import { env } from "@cobalt-web/env/server";
import { upsertMessage } from "@cobalt-web/server-data/chat/mutations";
import type { AppEnv } from "@cobalt-web/server-data/types";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  pruneMessages,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
import { Hono } from "hono";
import { start } from "workflow/api";

import { createCodeAgent } from "../../../ai/agents/code-agent/code-agent.js";
import {
  gatewayModel,
  getProviderOptions,
  parseModelWithReasoning,
} from "../../../ai/model-provider.js";
import type { ReasoningEffort } from "../../../ai/model-provider.js";
import { generateChatTitleWorkflow } from "../../../workflows/chat-title/workflow.js";
import { requirePaidUser } from "../middleware.js";

const SYSTEM_PROMPT = [
  "You are Cobalt, a personal financial AI assistant.",
  "You help users understand their finances, spending, investments, and financial goals.",
  "Be concise, clear, and actionable.",
].join(" ");

const MAX_HISTORY = 20;

function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (p): p is { text: string; type: "text" } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string"
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}

async function startChatTitle(
  chatTitle: string | null,
  chatId: string,
  message: UIMessage
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
      effort?: ReasoningEffort;
      message?: UIMessage;
      messages?: UIMessage[];
      mode?: "standard" | "analyst";
      model?: string;
      platform?: "web" | "mobile";
    }>();

    const {
      effort = "high",
      message,
      messages,
      mode = "standard",
      model,
      platform = "web",
    } = body ?? {};

    if (!message?.id || !message.parts?.length) {
      return c.json({ error: "message is required" }, 400);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages history is required" }, 400);
    }

    const chat = await db.query.chats.findFirst({
      where: { chatId: { eq: chatId }, userId: { eq: userId } },
    });
    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const { baseModel: loggedBaseModel, useReasoning: loggedUseReasoning } =
      parseModelWithReasoning(model ?? env.AI_GATEWAY_MODEL ?? "(default)");
    console.log("[chat-stream]", {
      chatId,
      effort: loggedUseReasoning ? effort : undefined,
      mode,
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

    if (mode === "analyst") {
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
              "readFile",
              "executeCode",
              "webSearch",
              "webExtract",
              "renderChart",
              "renderDocument",
              "compute",
              "askUser",
            ],
            type: "all",
          },
        ],
      });

      const codeAgent = await createCodeAgent(model, userId, effort);

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const result = await codeAgent.stream({
            messages: modelMessages,
            options: { currentDate, currentDateFormatted, platform },
          });
          const uiStream = result.toUIMessageStream({ sendReasoning: true });
          for await (const chunk of uiStream) {
            writer.write(chunk as Parameters<typeof writer.write>[0]);
          }
        },
        onError: (error) => {
          console.error("[analyst stream error]", error);
          return error instanceof Error ? error.message : "Stream error";
        },
        onFinish: async ({ responseMessage }) => {
          const assistantMessage = responseMessage as UIMessage;
          await upsertMessage({ chatId, message: assistantMessage });
        },
        originalMessages: messages,
      });

      return createUIMessageStreamResponse({ stream });
    }

    // Standard mode
    const rawStandardModel = model ?? env.AI_GATEWAY_MODEL;
    const { baseModel: standardBaseModel, useReasoning: standardUseReasoning } =
      parseModelWithReasoning(rawStandardModel);
    const standardProviderOptions = getProviderOptions(
      standardBaseModel,
      standardUseReasoning,
      effort
    );
    const modelMessages = pruneMessages({
      messages: trimmed,
      reasoning: "all",
    });
    const assistantMessageId = crypto.randomUUID();
    const result = streamText({
      messages: modelMessages,
      model: gatewayModel(standardBaseModel),
      onFinish: async ({ text, reasoningText }) => {
        const parts: UIMessage["parts"] = [];
        if (reasoningText) {
          parts.push({ text: reasoningText, type: "reasoning" });
        }
        parts.push({ text, type: "text" });
        const assistantMessage: UIMessage = {
          id: assistantMessageId,
          parts,
          role: "assistant",
        };
        await upsertMessage({ chatId, message: assistantMessage });
      },
      ...(standardProviderOptions && {
        providerOptions: standardProviderOptions,
      }),
      system: SYSTEM_PROMPT,
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  }
);
