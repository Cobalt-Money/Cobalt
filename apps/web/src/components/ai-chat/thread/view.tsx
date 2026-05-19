import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@cobalt-web/ui/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@cobalt-web/ui/components/ai-elements/conversation";
import { Message, MessageContent } from "@cobalt-web/ui/components/ai-elements/message";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { Message as ChatMessage, Part } from "@cobalt-web/zero";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import type { FileUIPart, UIMessage } from "ai";
import { memo, useEffect, useMemo } from "react";

import { useChat } from "@/components/ai-chat/state/chat-context";
import { MessagePartsRenderer } from "@/components/ai-chat/thread/message-parts";

/**
 * Chat thread: Zero-backed messages grouped by user turn, plus one optional
 * in-flight assistant message while streaming (ai-elements Conversation + Message).
 */
type ChatMessagePart = Part;
type ChatMessageRow = ChatMessage & { readonly parts: readonly Part[] };

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
    .map((p) => p.text_text ?? "")
    .join("");
}

function isNullish<T>(v: T | null | undefined): v is null | undefined {
  return v === null || v === undefined;
}

function getFileParts(message: ChatMessageRow): (FileUIPart & { id: string })[] {
  const out: (FileUIPart & { id: string })[] = [];
  for (let i = 0; i < message.parts.length; i += 1) {
    const p = message.parts[i];
    if (!p || p.type !== "file" || isNullish(p.file_url) || isNullish(p.file_mediaType)) {
      continue;
    }
    out.push({
      filename: p.file_filename ?? undefined,
      id: `${message.messageId}-file-${i}`,
      mediaType: p.file_mediaType,
      type: "file",
      url: p.file_url,
    });
  }
  return out;
}

function filePartFromRow(p: ChatMessagePart): UIMessage["parts"][number] | null {
  if (isNullish(p.file_url) || isNullish(p.file_mediaType)) {
    return null;
  }
  const filePart: Record<string, unknown> = {
    mediaType: p.file_mediaType,
    type: "file",
    url: p.file_url,
  };
  if (!isNullish(p.file_filename)) {
    filePart.filename = p.file_filename;
  }
  return filePart as UIMessage["parts"][number];
}

function partRowToUIPart(p: ChatMessagePart): UIMessage["parts"][number] | null {
  const { type } = p;

  if (type === "text") {
    if (isNullish(p.text_text)) {
      return null;
    }
    return { text: p.text_text, type: "text" };
  }

  if (type === "reasoning") {
    if (isNullish(p.reasoning_text)) {
      return null;
    }
    return { text: p.reasoning_text, type: "reasoning" };
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
    if (!isNullish(p.tool_input)) {
      toolPart.input = p.tool_input;
    }
    if (!isNullish(p.tool_output)) {
      toolPart.output = p.tool_output;
    }
    if (p.tool_errorText) {
      toolPart.errorText = p.tool_errorText;
    }
    return toolPart as UIMessage["parts"][number];
  }

  if (type === "file") {
    return filePartFromRow(p);
  }

  if (type.startsWith("data-") && !isNullish(p.data)) {
    return { data: p.data, type } as UIMessage["parts"][number];
  }

  if (type === "step-start") {
    return { type: "step-start" } as UIMessage["parts"][number];
  }

  return null;
}

function rowToUIMessage(message: ChatMessageRow): UIMessage {
  return {
    id: message.messageId,
    parts: message.parts
      .map(partRowToUIPart)
      .filter((p): p is UIMessage["parts"][number] => p !== null),
    role: message.role as "user" | "assistant",
  };
}

/**
 * Structural equality on the fields we actually render. Guards against Zero
 * handing us a fresh row reference for unchanged content — without this, every
 * streamed chunk would force a full re-render of every settled message.
 */
function rowPartsEqual(a: readonly ChatMessagePart[], b: readonly ChatMessagePart[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const ap = a[i];
    const bp = b[i];
    if (!(ap && bp)) {
      return false;
    }
    if (ap.type !== bp.type) {
      return false;
    }
    if (ap.text_text !== bp.text_text) {
      return false;
    }
    if (ap.reasoning_text !== bp.reasoning_text) {
      return false;
    }
    if (ap.tool_state !== bp.tool_state) {
      return false;
    }
    if (ap.tool_toolCallId !== bp.tool_toolCallId) {
      return false;
    }
    if (ap.tool_input !== bp.tool_input) {
      return false;
    }
    if (ap.tool_output !== bp.tool_output) {
      return false;
    }
    if (ap.tool_errorText !== bp.tool_errorText) {
      return false;
    }
    if (ap.data !== bp.data) {
      return false;
    }
    if (ap.file_url !== bp.file_url) {
      return false;
    }
  }
  return true;
}

function rowsEqual(a: ChatMessageRow, b: ChatMessageRow): boolean {
  if (a === b) {
    return true;
  }
  if (a.messageId !== b.messageId) {
    return false;
  }
  if (a.role !== b.role) {
    return false;
  }
  return rowPartsEqual(a.parts, b.parts);
}

const UserBubble = memo(
  function UserBubble({ row }: { row: ChatMessageRow }) {
    const text = useMemo(() => getTextContent(row), [row]);
    const files = useMemo(() => getFileParts(row), [row]);
    return (
      <Message className="w-full max-w-full" from="user">
        <MessageContent
          className={cn(
            "w-full max-w-full text-base leading-snug",
            "group-[.is-user]:rounded-3xl group-[.is-user]:bg-popover group-[.is-user]:px-5 group-[.is-user]:py-3.5 group-[.is-user]:text-foreground",
          )}
        >
          {files.length > 0 && (
            <Attachments className="mb-2 w-full justify-start" variant="grid">
              {files.map((file) => (
                <Attachment data={file} key={file.id}>
                  <AttachmentPreview />
                </Attachment>
              ))}
            </Attachments>
          )}
          {text && <p className="whitespace-pre-wrap">{text}</p>}
        </MessageContent>
      </Message>
    );
  },
  (prev, next) => rowsEqual(prev.row, next.row),
);

const AssistantBubble = memo(
  function AssistantBubble({ row }: { row: ChatMessageRow }) {
    const message = useMemo(() => rowToUIMessage(row), [row]);
    return (
      <Message className="max-w-full" from="assistant">
        <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
          <MessagePartsRenderer isStreaming={false} message={message} />
        </MessageContent>
      </Message>
    );
  },
  (prev, next) => rowsEqual(prev.row, next.row),
);

export default function ChatView() {
  const { chatId } = useParams({ from: "/_auth/ai-chat/$chatId" });
  const [messages, messagesResult] = useQuery(queries.chats.messages({ chatId }));
  const { inFlightMessage, isStreaming, streamStartedAt, clearStream, setZeroMessages } = useChat();

  useEffect(() => {
    setZeroMessages(messages);
  }, [messages, setZeroMessages]);

  const sections = useMemo(() => groupMessagesIntoSections(messages), [messages]);

  /**
   * Once streaming ends, keep showing the overlay until Zero delivers the
   * assistant message (createdAt > streamStartedAt). This prevents any gap
   * between the local streaming state and Zero's reactive data.
   */
  useEffect(() => {
    if (!isStreaming && inFlightMessage && streamStartedAt !== null) {
      const startMs = streamStartedAt.getTime();
      const synced = messages.some(
        (m) => m.role === "assistant" && typeof m.createdAt === "number" && m.createdAt > startMs,
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
                {section.user && <UserBubble row={section.user} />}
                {section.assistants.map((assistant) => (
                  <AssistantBubble key={String(assistant.messageId)} row={assistant} />
                ))}
              </div>
            );
          })}

          {inFlightMessage && (
            <Message className="max-w-full" from="assistant">
              <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
                <MessagePartsRenderer isStreaming={isStreaming} message={inFlightMessage} />
              </MessageContent>
            </Message>
          )}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
