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

import { ChatPromptInput } from "@/components/ai-chat/input/prompt-input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface BabyAIChatProps {
  messages: ChatMessage[];
}

export function BabyAIChat({ messages }: BabyAIChatProps) {
  return (
    <Conversation className="h-full min-h-0 w-full max-w-lg [mask-image:linear-gradient(to_bottom,black_calc(100%-100px),transparent)]">
      <ConversationContent className="gap-0 px-0 pb-32">
        <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-8">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                className="sticky top-0 z-10 w-full rounded-3xl bg-[oklch(0.949_0_0)] px-5 py-3.5 text-base text-foreground dark:bg-[oklch(0.29_0_0)]"
                key={msg.id}
              >
                <p>{msg.text}</p>
              </div>
            ) : (
              <Message className="max-w-full" from="assistant" key={msg.id}>
                <MessageContent className="w-full min-w-0 px-4 text-base leading-snug">
                  <MessageResponse>{msg.text}</MessageResponse>
                </MessageContent>
              </Message>
            )
          )}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
      <div className="border-t border-border/60 p-3">
        <ChatPromptInput />
      </div>
    </Conversation>
  );
}
