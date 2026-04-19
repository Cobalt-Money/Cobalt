import { PromptInputProvider } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ChatInputDock } from "@/components/ai-chat/input/input-dock";
import { AgentSettingsProvider } from "@/components/ai-chat/state/agent-settings-context";
import { ChatProvider } from "@/components/ai-chat/state/chat-context";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/ai-chat")({
  component: AiChatLayout,
});

function AiChatLayout() {
  return (
    <SidebarShellLayout flushBottom>
      <AgentSettingsProvider>
        <ChatProvider>
          <PromptInputProvider>
            <div className="relative h-full min-h-0 w-full flex-1">
              <div className="h-full min-h-0 w-full">
                <Outlet />
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-[44rem] pb-3">
                <div className="pointer-events-auto">
                  <ChatInputDock />
                </div>
              </div>
            </div>
          </PromptInputProvider>
        </ChatProvider>
      </AgentSettingsProvider>
    </SidebarShellLayout>
  );
}
