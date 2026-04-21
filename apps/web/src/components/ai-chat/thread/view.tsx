import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@cobalt-web/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@cobalt-web/ui/components/ai-elements/message";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { useEffect, useMemo } from "react";

import { useChat } from "@/components/ai-chat/state/chat-context";
import { MessagePartsRenderer } from "@/components/ai-chat/thread/message-parts";

/**
 * Chat thread: Zero-backed messages grouped by user turn, plus one optional
 * in-flight assistant message while streaming (ai-elements Conversation + Message).
 */
interface ChatMessagePart {
  type: unknown;
  text_text: unknown;
  reasoning_text: unknown;
  tool_state: unknown;
  tool_toolCallId: unknown;
  tool_input: unknown;
  tool_output: unknown;
  tool_errorText: unknown;
  data: unknown;
}

interface ChatMessageRow {
  messageId: unknown;
  role: unknown;
  createdAt: unknown;
  parts: readonly ChatMessagePart[];
}

function groupMessagesIntoSections(messages: readonly ChatMessageRow[]) {
  const sections: {
    user: ChatMessageRow | null;
    assistants: ChatMessageRow[];
  }[] = [];
  let current: {
    user: ChatMessageRow | null;
    assistants: ChatMessageRow[];
  } | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (current) {
        sections.push(current);
      }
      current = { assistants: [], user: message };
    } else if (current) {
      current.assistants.push(message);
    } else {
      sections.push({ assistants: [message], user: null });
    }
  }
  if (current) {
    sections.push(current);
  }

  return sections;
}

function getTextContent(message: ChatMessageRow) {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (typeof p.text_text === "string" ? p.text_text : ""))
    .join("");
}

function partRowToUIPart(
  p: ChatMessagePart
): UIMessage["parts"][number] | null {
  const type = typeof p.type === "string" ? p.type : null;
  if (!type) {
    return null;
  }

  if (type === "text") {
    if (p.text_text === null || p.text_text === undefined) {
      return null;
    }
    return { text: String(p.text_text), type: "text" };
  }

  if (type === "reasoning") {
    if (p.reasoning_text === null || p.reasoning_text === undefined) {
      return null;
    }
    return { text: String(p.reasoning_text), type: "reasoning" };
  }

  if (type.startsWith("tool-")) {
    if (!p.tool_toolCallId || !p.tool_state) {
      return null;
    }
    const toolPart: Record<string, unknown> = {
      state: p.tool_state,
      toolCallId: p.tool_toolCallId,
      type,
    };
    if (p.tool_input) {
      toolPart.input = p.tool_input;
    }
    if (p.tool_output) {
      toolPart.output = p.tool_output;
    }
    if (p.tool_errorText) {
      toolPart.errorText = p.tool_errorText;
    }
    return toolPart as UIMessage["parts"][number];
  }

  if (type.startsWith("data-") && p.data) {
    return { data: p.data, type } as UIMessage["parts"][number];
  }

  if (type === "step-start") {
    return { type: "step-start" } as UIMessage["parts"][number];
  }

  return null;
}

function rowToUIMessage(message: ChatMessageRow): UIMessage {
  return {
    id: String(message.messageId),
    parts: message.parts
      .map(partRowToUIPart)
      .filter((p): p is UIMessage["parts"][number] => p !== null),
    role: String(message.role) as "user" | "assistant",
  };
}

export default function ChatView() {
  const { chatId } = useParams({ from: "/_auth/ai-chat/$chatId" });
  const [messages, messagesResult] = useQuery(
    queries.chats.messages({ chatId })
  );
  const {
    inFlightMessage,
    isStreaming,
    streamStartedAt,
    clearStream,
    setZeroMessages,
  } = useChat();

  useEffect(() => {
    setZeroMessages(messages);
  }, [messages, setZeroMessages]);

  const sections = useMemo(
    () => groupMessagesIntoSections(messages),
    [messages]
  );

  /**
   * Once streaming ends, keep showing the overlay until Zero delivers the
   * assistant message (createdAt > streamStartedAt). This prevents any gap
   * between the local streaming state and Zero's reactive data.
   */
  useEffect(() => {
    if (!isStreaming && inFlightMessage && streamStartedAt !== null) {
      const startMs = streamStartedAt.getTime();
      const synced = messages.some(
        (m) =>
          m.role === "assistant" &&
          typeof m.createdAt === "number" &&
          m.createdAt > startMs
      );
      if (synced) {
        clearStream();
      }
    }
  }, [messages, isStreaming, inFlightMessage, streamStartedAt, clearStream]);

  if (messagesResult.type !== "complete") {
    return (
      <div className="h-full min-h-0 w-full [mask-image:linear-gradient(to_bottom,black_calc(100%-100px),transparent)]" />
    );
  }

  return (
    <Conversation className="h-full min-h-0 w-full [mask-image:linear-gradient(to_bottom,black_calc(100%-100px),transparent)]">
      <ConversationContent className="gap-0 px-0 pb-32">
        <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-8">
          {sections.map((section) => {
            const sectionKey = section.user
              ? String(section.user.messageId)
              : String(section.assistants[0]?.messageId);

            return (
              <div className="flex flex-col gap-8" key={sectionKey}>
                {section.user && (
                  <Message className="w-full max-w-full" from="user">
                    <MessageContent
                      className={cn(
                        "w-full max-w-full text-base leading-snug",
                        "group-[.is-user]:rounded-3xl group-[.is-user]:bg-[oklch(0.949_0_0)] group-[.is-user]:px-5 group-[.is-user]:py-3.5 group-[.is-user]:text-foreground",
                        "dark:group-[.is-user]:bg-[oklch(0.29_0_0)]"
                      )}
                    >
                      <p className="whitespace-pre-wrap">
                        {getTextContent(section.user)}
                      </p>
                    </MessageContent>
                  </Message>
                )}
                {section.assistants.map((assistant) => (
                  <Message
                    className="max-w-full"
                    from="assistant"
                    key={String(assistant.messageId)}
                  >
                    <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
                      <MessagePartsRenderer
                        isStreaming={false}
                        message={rowToUIMessage(assistant)}
                      />
                    </MessageContent>
                  </Message>
                ))}
              </div>
            );
          })}

          {inFlightMessage && (
            <Message className="max-w-full" from="assistant">
              <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
                <MessagePartsRenderer
                  isStreaming={isStreaming}
                  message={inFlightMessage}
                />
              </MessageContent>
            </Message>
          )}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
