import { PromptInputProvider } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { useRouterState } from "@tanstack/react-router";

import { ChatPromptInput } from "@/components/ai-chat/input/prompt-input";
import { AgentSettingsProvider } from "@/components/ai-chat/state/agent-settings-context";
import { ChatProvider } from "@/components/ai-chat/state/chat-context";

export function GlobalFloatingChatInput() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/ai-chat")) {
    return null;
  }

  return (
    <AgentSettingsProvider>
      <ChatProvider>
        <PromptInputProvider>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 mx-auto w-full max-w-md px-4">
            <div className="pointer-events-auto">
              <ChatPromptInput extraInputGroupClassName="border border-foreground/20 has-[[data-slot=input-group-control]:focus-visible]:border-foreground/20" />
            </div>
          </div>
        </PromptInputProvider>
      </ChatProvider>
    </AgentSettingsProvider>
  );
}
