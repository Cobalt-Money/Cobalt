import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { useChat } from "@/components/ai-chat/state/chat-context";

import type { PendingAskUserQuestion } from "./ask-user-panel";
import { AskUserPanel } from "./ask-user-panel";
import { ChatPromptInput } from "./prompt-input";
import { PromptQueue } from "./prompt-queue";

export function ChatInputDock() {
  const params = useParams({ strict: false }) as { chatId?: string };
  const { chatId } = params;
  const { queuedMessages, removeFromQueue, updateInQueue } = useChat();

  return (
    <div className="flex w-full flex-col">
      {chatId && <PendingQuestions chatId={chatId} />}
      <PromptQueue items={queuedMessages} onRemove={removeFromQueue} onUpdate={updateInQueue} />
      <ChatPromptInput />
    </div>
  );
}

function PendingQuestions({ chatId }: { chatId: string }) {
  const [rows] = useQuery(queries.chats.messages({ chatId }));
  const { inFlightMessage } = useChat();

  const questions = useMemo<PendingAskUserQuestion[]>(() => {
    const seen = new Set<string>();
    const list: PendingAskUserQuestion[] = [];

    const consider = (
      toolCallId: string,
      input: { question?: unknown; options?: unknown } | undefined,
    ) => {
      if (!toolCallId || seen.has(toolCallId) || !input) {
        return;
      }
      const question = typeof input.question === "string" ? input.question : null;
      const options = Array.isArray(input.options)
        ? (input.options as PendingAskUserQuestion["options"])
        : null;
      if (!(question && options)) {
        return;
      }
      seen.add(toolCallId);
      list.push({ options, question, toolCallId });
    };

    // Inspect Zero-synced message parts first (authoritative once saved).
    for (const row of rows ?? []) {
      if (row.role !== "assistant") {
        continue;
      }
      for (const part of row.parts) {
        if (part.type === "tool-askUser" && part.tool_state === "input-available") {
          consider(
            String(part.tool_toolCallId ?? ""),
            part.tool_input as PendingAskUserQuestion | undefined,
          );
        }
      }
    }

    // Then the in-flight message (covers the gap before Zero syncs).
    if (inFlightMessage?.role === "assistant") {
      for (const part of inFlightMessage.parts) {
        if (
          part.type === "tool-askUser" &&
          (part as { state?: string }).state === "input-available"
        ) {
          consider(
            (part as { toolCallId?: string }).toolCallId ?? "",
            (part as { input?: PendingAskUserQuestion }).input,
          );
        }
      }
    }

    return list;
  }, [rows, inFlightMessage]);

  if (questions.length === 0) {
    return null;
  }
  return <AskUserPanel chatId={chatId} questions={questions} />;
}
