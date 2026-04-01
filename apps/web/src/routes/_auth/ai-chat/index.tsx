import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@cobalt-web/ui/components/ai-elements/conversation";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareIcon } from "lucide-react";

export const Route = createFileRoute("/_auth/ai-chat/")({
  component: AiChatIndex,
  staticData: { title: "AI Chat" },
});

function AiChatIndex() {
  return (
    <Conversation>
      <ConversationContent>
        <ConversationEmptyState
          description="Select a chat from the sidebar or start a new conversation"
          icon={<MessageSquareIcon className="size-8" />}
          title="Welcome to AI Chat"
        />
      </ConversationContent>
    </Conversation>
  );
}
