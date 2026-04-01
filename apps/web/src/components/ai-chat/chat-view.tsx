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
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";

export default function ChatView() {
  const { chatId } = useParams({ from: "/_auth/ai-chat/$chatId" });
  const [messages] = useQuery(queries.chats.messages({ chatId }));

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message) => {
          const textContent = message.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text_text ?? "")
            .join("");

          return (
            <Message
              from={message.role as "user" | "assistant"}
              key={String(message.messageId)}
            >
              <MessageContent>
                {message.role === "assistant" ? (
                  <MessageResponse>{textContent}</MessageResponse>
                ) : (
                  <p>{textContent}</p>
                )}
              </MessageContent>
            </Message>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
