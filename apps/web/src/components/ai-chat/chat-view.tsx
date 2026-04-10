import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@cobalt-web/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@cobalt-web/ui/components/ai-elements/message";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { CHAT_THREAD_COLUMN_CLASS } from "@/components/ai-chat/chat-thread-layout";

/** Zero row shape: `messageId` / `role` / `parts` are typed as `unknown` in query results. */
interface ChatMessageRow {
  messageId: unknown;
  role: unknown;
  parts: readonly { type: unknown; text_text: unknown }[];
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

export default function ChatView() {
  const { chatId } = useParams({ from: "/_auth/ai-chat/$chatId" });
  const [messages] = useQuery(queries.chats.messages({ chatId }));

  const sections = useMemo(
    () => groupMessagesIntoSections(messages),
    [messages]
  );

  return (
    <Conversation className="h-full min-h-0 w-full [mask-image:linear-gradient(to_bottom,black_calc(100%-100px),transparent)]">
      <ConversationContent className="gap-0 px-0 pb-32">
        <div className={cn(CHAT_THREAD_COLUMN_CLASS, "flex flex-col gap-8")}>
          {sections.map((section) => {
            const sectionKey = section.user
              ? String(section.user.messageId)
              : String(section.assistants[0]?.messageId);

            return (
              <div className="flex flex-col gap-8" key={sectionKey}>
                {section.user && (
                  <div className="sticky top-0 z-10 w-full rounded-3xl bg-[oklch(0.949_0_0)] px-5 py-3.5 text-base text-foreground dark:bg-[oklch(0.29_0_0)]">
                    <p>{getTextContent(section.user)}</p>
                  </div>
                )}
                {section.assistants.map((assistant) => (
                  <Message
                    className="max-w-full"
                    from="assistant"
                    key={String(assistant.messageId)}
                  >
                    <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
                      <MessageResponse>
                        {getTextContent(assistant)}
                      </MessageResponse>
                    </MessageContent>
                  </Message>
                ))}
              </div>
            );
          })}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
