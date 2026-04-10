import { CobaltPromptInput } from "@cobalt-web/ui/cobalt/prompt-input";
import {
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@cobalt-web/ui/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@cobalt-web/ui/components/ai-elements/prompt-input";

async function handleChatPromptSubmit(_message: PromptInputMessage) {
  // Wire-up to chat streaming / mutators will follow.
}

function ChatPromptInputFooter() {
  const { textInput } = usePromptInputController();
  const canSubmit = textInput.value.trim().length > 0;

  return (
    <PromptInputFooter className="pb-2 pt-1.5">
      <PromptInputTools />
      <PromptInputSubmit disabled={!canSubmit} />
    </PromptInputFooter>
  );
}

export function ChatPromptInput() {
  return (
    <PromptInputProvider>
      <CobaltPromptInput
        inputGroupClassName="rounded-3xl has-[textarea]:rounded-2xl has-data-[align=block-end]:rounded-2xl"
        onSubmit={handleChatPromptSubmit}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-10 max-h-40 pl-4 pt-3.5 pb-1.5 text-base md:text-base"
            placeholder="Message Cobalt…"
          />
        </PromptInputBody>
        <ChatPromptInputFooter />
      </CobaltPromptInput>
    </PromptInputProvider>
  );
}
