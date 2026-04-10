import { CobaltPromptInput } from "@cobalt-web/ui/cobalt/prompt-input";
import {
  PromptInputBody,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@cobalt-web/ui/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { cn } from "@cobalt-web/ui/lib/utils";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

async function handleChatPromptSubmit(_message: PromptInputMessage) {
  // Wire-up to chat streaming / mutators will follow.
}

const PILL_INPUT_GROUP =
  "h-auto rounded-full has-[textarea]:rounded-full has-data-[align=block-end]:rounded-full";
const EXPANDED_INPUT_GROUP =
  "h-auto flex-col rounded-3xl has-[textarea]:rounded-3xl has-data-[align=block-end]:rounded-3xl";

const PLUS_BUTTON_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function ChatPromptInputInner() {
  const { textInput } = usePromptInputController();
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = textInput.value.trim().length > 0;

  const checkOverflow = useCallback(() => {
    const el = textareaRef.current;
    if (!el || expanded) {
      return;
    }
    if (el.scrollHeight > el.clientHeight) {
      setExpanded(true);
    }
  }, [expanded]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!expanded && e.currentTarget.value.includes("\n")) {
        textInput.setInput(e.currentTarget.value.replaceAll("\n", ""));
        setExpanded(true);
        return;
      }
      requestAnimationFrame(checkOverflow);
    },
    [expanded, checkOverflow, textInput]
  );

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const el = textareaRef.current;
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [expanded]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Backspace" && expanded && textInput.value === "") {
        e.preventDefault();
        setExpanded(false);
      }
    },
    [expanded, textInput.value]
  );

  const handleBlur = useCallback(() => {
    if (expanded && textInput.value.trim().length === 0) {
      setExpanded(false);
    }
  }, [expanded, textInput.value]);

  return (
    <CobaltPromptInput
      inputGroupClassName={expanded ? EXPANDED_INPUT_GROUP : PILL_INPUT_GROUP}
      onSubmit={handleChatPromptSubmit}
    >
      {expanded ? (
        <>
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              className="min-h-10 max-h-40 pl-4 pt-3.5 pb-1.5 text-base md:text-base"
              onBlur={handleBlur}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Message Cobalt…"
            />
          </PromptInputBody>
          <div className="flex w-full items-center justify-between px-1.5 pb-2">
            <button type="button" className={PLUS_BUTTON_CLASS}>
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-4"
                strokeWidth={2}
              />
            </button>
            <PromptInputSubmit disabled={!canSubmit} />
          </div>
        </>
      ) : (
        <>
          <button type="button" className={cn(PLUS_BUTTON_CLASS, "ml-1.5")}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2}
            />
          </button>
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              className="min-h-0 max-h-12 overflow-hidden pl-2 py-3 text-base md:text-base"
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder="Message Cobalt…"
              rows={1}
            />
          </PromptInputBody>
          <div className="flex shrink-0 items-center pr-1.5">
            <PromptInputSubmit disabled={!canSubmit} />
          </div>
        </>
      )}
    </CobaltPromptInput>
  );
}

export function ChatPromptInput() {
  return (
    <PromptInputProvider>
      <ChatPromptInputInner />
    </PromptInputProvider>
  );
}
