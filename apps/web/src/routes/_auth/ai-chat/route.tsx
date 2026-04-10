import { cn } from "@cobalt-web/ui/lib/utils";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ChatPromptInput } from "@/components/ai-chat/chat-prompt-input";
import { CHAT_THREAD_COLUMN_CLASS } from "@/components/ai-chat/chat-thread-layout";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/ai-chat")({
  component: AiChatLayout,
});

function AiChatLayout() {
  return (
    <SidebarShellLayout flushBottom>
      <div
        className={cn(
          CHAT_THREAD_COLUMN_CLASS,
          "flex min-h-0 min-w-0 h-full flex-1 flex-col pb-3"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
        <div className="shrink-0">
          <ChatPromptInput />
        </div>
      </div>
    </SidebarShellLayout>
  );
}
