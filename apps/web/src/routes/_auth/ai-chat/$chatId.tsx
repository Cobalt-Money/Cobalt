import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const AiChatConversation = lazy(() => import("@/components/ai-chat/chat-view"));

export const Route = createFileRoute("/_auth/ai-chat/$chatId")({
  component: AiChatConversation,
  staticData: { title: "Chat" },
});
