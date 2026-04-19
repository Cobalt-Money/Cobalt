import { CobaltPromptInput } from "@cobalt-web/ui/cobalt/prompt-input";
import {
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@cobalt-web/ui/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import {
  ModelChip,
  ModelPicker,
} from "@/components/ai-chat/input/model-picker";
import { useChat } from "@/components/ai-chat/state/chat-context";

function ChatPromptInputInner() {
  const { textInput } = usePromptInputController();
  const { submit, isStreaming, stop } = useChat();
  // strict: false so this works in both /_auth/ai-chat/ and /_auth/ai-chat/$chatId
  const params = useParams({ strict: false }) as { chatId?: string };
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Typing while streaming is allowed — submit routes the message into the queue.
  const canSubmit = textInput.value.trim().length > 0;

  const handleChatPromptSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const content = message.text.trim();
      if (!content) {
        return;
      }
      setExpanded(false);
      await submit(params.chatId, content);
    },
    [submit, params.chatId]
  );

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
      className="w-full min-w-0"
      inputGroupClassName={
        expanded
          ? "h-auto flex-col rounded-3xl has-[textarea]:rounded-3xl has-data-[align=block-end]:rounded-3xl"
          : "h-auto rounded-full has-[textarea]:rounded-full has-data-[align=block-end]:rounded-full"
      }
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-4"
                  strokeWidth={2}
                />
              </button>
              <ModelPicker />
            </div>
            <PromptInputSubmit
              disabled={!canSubmit && !isStreaming}
              onStop={stop}
              status={isStreaming ? "streaming" : "ready"}
            />
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
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
            <ModelChip />
            <PromptInputSubmit
              disabled={!canSubmit && !isStreaming}
              onStop={stop}
              status={isStreaming ? "streaming" : "ready"}
            />
          </div>
        </>
      )}
    </CobaltPromptInput>
  );
}

export function ChatPromptInput() {
  return <ChatPromptInputInner />;
}
