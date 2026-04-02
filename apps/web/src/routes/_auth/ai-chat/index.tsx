import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@cobalt-web/ui/components/ai-elements/conversation";
import { AiChat02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";

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
          icon={<HugeiconsIcon className="size-8" icon={AiChat02Icon} />}
          title="Welcome to AI Chat"
        />
      </ConversationContent>
    </Conversation>
  );
}
