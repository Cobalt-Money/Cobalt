import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@cobalt-web/ui/components/ai-elements/attachments";
import { CobaltPromptInput } from "@cobalt-web/ui/cobalt/prompt-input";
import {
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@cobalt-web/ui/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import { cn } from "@cobalt-web/ui/lib/utils";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { toast } from "sonner";

import { ModelChip, ModelPicker } from "@/components/ai-chat/input/model-picker";
import { useChat } from "@/components/ai-chat/state/chat-context";

/**
 * Image attachments only. Anthropic caps images at 5MB *base64-encoded*, and
 * base64 inflates raw bytes by ~33%, so the raw file must stay under ~3.75MB.
 * 3.5MB leaves headroom for the data-URL prefix.
 */
const ACCEPTED_FILE_TYPES = "image/*";
const MAX_FILE_SIZE_BYTES = 3.5 * 1024 * 1024;

interface ChatPromptInputInnerProps {
  extraInputGroupClassName?: string;
}

function ChatPromptInputInner({ extraInputGroupClassName }: ChatPromptInputInnerProps) {
  const { textInput, attachments } = usePromptInputController();
  const { submit, isStreaming, stop } = useChat();
  // strict: false so this works in both /_auth/ai-chat/ and /_auth/ai-chat/$chatId
  const params = useParams({ strict: false }) as { chatId?: string };
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAttachments = attachments.files.length > 0;
  // Typing while streaming is allowed — submit routes the message into the queue.
  const canSubmit = textInput.value.trim().length > 0 || hasAttachments;

  // Attachments need the multi-row layout; the collapsed pill can't host them.
  useEffect(() => {
    if (hasAttachments) {
      setExpanded(true);
    }
  }, [hasAttachments]);

  const handleChatPromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      const { files } = message;
      const content = message.text.trim();
      if (!content && (!files || files.length === 0)) {
        return;
      }
      setExpanded(false);
      textInput.clear();
      void submit(params.chatId, content, files);
    },
    [submit, params.chatId, textInput],
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
    [expanded, checkOverflow, textInput],
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
      if (e.key === "Backspace" && expanded && textInput.value === "" && !hasAttachments) {
        e.preventDefault();
        setExpanded(false);
      }
    },
    [expanded, textInput.value, hasAttachments],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Don't collapse when focus moves into a toolbar dropdown (e.g. model picker) —
      // collapsing unmounts the dropdown, so it would just snap shut.
      const next = e.relatedTarget as HTMLElement | null;
      if (
        next?.closest('[data-slot="dropdown-menu-trigger"],[data-slot="dropdown-menu-content"]')
      ) {
        return;
      }
      if (expanded && textInput.value.trim().length === 0 && !hasAttachments) {
        setExpanded(false);
      }
    },
    [expanded, textInput.value, hasAttachments],
  );

  const attachmentPreview = hasAttachments ? (
    <Attachments className="w-full justify-start px-3 pt-2.5" variant="grid">
      {attachments.files.map((file) => (
        <Attachment
          className="size-32"
          data={file}
          key={file.id}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview className="bg-transparent" />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  ) : null;

  return (
    <CobaltPromptInput
      accept={ACCEPTED_FILE_TYPES}
      className="w-full min-w-0"
      inputGroupClassName={cn(
        expanded
          ? "h-auto flex-col rounded-3xl has-[textarea]:rounded-3xl has-data-[align=block-end]:rounded-3xl"
          : "h-auto rounded-full has-[textarea]:rounded-full has-data-[align=block-end]:rounded-full",
        extraInputGroupClassName,
      )}
      maxFileSize={MAX_FILE_SIZE_BYTES}
      multiple
      onError={(err) => {
        toast.error(
          err.code === "max_file_size"
            ? "Image is too large (max 3.5MB)."
            : "Only image files can be attached.",
        );
      }}
      onSubmit={handleChatPromptSubmit}
    >
      {expanded ? (
        <>
          {attachmentPreview}
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              className="min-h-10 max-h-40 pl-4 pt-3.5 pb-1.5 text-base md:text-base"
              onBlur={handleBlur}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Cobalt"
            />
          </PromptInputBody>
          <div className="flex w-full items-center justify-between px-1.5 pb-2">
            <div className="flex items-center gap-1">
              <button
                aria-label="Attach image"
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => attachments.openFileDialog()}
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
              </button>
              <ModelPicker isStreaming={isStreaming} />
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
            aria-label="Attach image"
            type="button"
            className="ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => attachments.openFileDialog()}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
          </button>
          <PromptInputBody>
            <PromptInputTextarea
              ref={textareaRef}
              className="min-h-0 max-h-12 overflow-hidden pl-2 py-3 text-base md:text-base"
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder="Ask Cobalt"
              rows={1}
            />
          </PromptInputBody>
          <div className="flex shrink-0 items-center pr-1.5">
            <ModelChip isStreaming={isStreaming} />
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

export function ChatPromptInput({
  extraInputGroupClassName,
}: {
  extraInputGroupClassName?: string;
} = {}) {
  return <ChatPromptInputInner extraInputGroupClassName={extraInputGroupClassName} />;
}
