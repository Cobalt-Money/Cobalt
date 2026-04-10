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
    <SidebarShellLayout flushBottom mainScrollMask={false}>
      <div className="relative h-full min-h-0 w-full flex-1">
        <div className="h-full min-h-0 w-full">
          <Outlet />
        </div>
        <div
          className={cn(
            CHAT_THREAD_COLUMN_CLASS,
            "pointer-events-none absolute bottom-0 left-0 right-0 z-10 pb-3"
          )}
        >
          <div className="pointer-events-auto">
            <ChatPromptInput />
          </div>
        </div>
      </div>
    </SidebarShellLayout>
  );
}
