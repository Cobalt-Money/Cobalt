import { queries } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { createFileRoute } from "@tanstack/react-router";

import ChatView from "@/components/ai-chat/chat-view";

export const Route = createFileRoute("/_auth/ai-chat/$chatId")({
  component: ChatRoute,
  loader: ({ context, params }) => {
    const z = context.zero as unknown as Zero;
    z.run(queries.chats.messages({ chatId: params.chatId }));
  },
  staticData: { title: "Chat" },
});

function ChatRoute() {
  return <ChatView />;
}
