import { createFileRoute } from "@tanstack/react-router";

import ChatView from "@/components/ai-chat/chat-view";

export const Route = createFileRoute("/_auth/ai-chat/$chatId")({
  component: ChatRoute,
  staticData: { title: "Chat" },
});

function ChatRoute() {
  return <ChatView />;
}
