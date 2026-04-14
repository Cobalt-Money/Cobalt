import { createFileRoute } from "@tanstack/react-router";

import { ChatEmptyState } from "@/components/ai-chat/chat-empty-state";

export const Route = createFileRoute("/_auth/ai-chat/")({
  component: AiChatIndex,
  staticData: { title: "AI Chat" },
});

function AiChatIndex() {
  return <ChatEmptyState />;
}
