import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import ChatView from "@/components/ai-chat/thread/view";

export const Route = createFileRoute("/_auth/ai-chat/$chatId")({
  component: ChatRoute,
  loader: ({ context, params }) => {
    context.zero.run(queries.chats.messages({ chatId: params.chatId }));
    context.zero.run(queries.chats.chatById({ chatId: params.chatId }));
  },
  staticData: { title: "Chat" },
});

function ChatRoute() {
  const { chatId } = Route.useParams();
  return <ChatView key={chatId} />;
}
