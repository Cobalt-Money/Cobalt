import { Queue } from "@cobalt-web/ui/components/ai-elements/queue";
import { cobaltGhostSurfaceClass } from "@cobalt-web/ui/cobalt/prompt-input";
import { Cancel01Icon, CheckmarkCircle02Icon, ClockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import type { QueuedMessage } from "@/components/ai-chat/state/chat-context";

interface PromptQueueProps {
  items: QueuedMessage[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}

export function PromptQueue({ items, onRemove, onUpdate }: PromptQueueProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Queue className={`mb-2 w-full rounded-2xl px-3 pt-2 pb-2 ${cobaltGhostSurfaceClass}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <HugeiconsIcon icon={ClockIcon} className="size-4" strokeWidth={2} />
          <span>Queued</span>
        </div>
        <span className="text-muted-foreground text-xs">{items.length} waiting</span>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <QueueRow
            item={item}
            key={item.id}
            onRemove={() => onRemove(item.id)}
            onUpdate={(text) => onUpdate(item.id, text)}
          />
        ))}
      </ul>
    </Queue>
  );
}

interface QueueRowProps {
  item: QueuedMessage;
  onRemove: () => void;
  onUpdate: (text: string) => void;
}

function QueueRow({ item, onRemove, onUpdate }: QueueRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      const len = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onRemove();
    } else if (trimmed !== item.text) {
      onUpdate(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(item.text);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex items-start gap-1.5 rounded-xl bg-white px-3 py-2 ring-1 ring-primary/30 ring-inset focus-within:ring-primary/60 dark:bg-white/10">
        <textarea
          className="min-h-[1.5rem] flex-1 resize-none bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/60"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          ref={inputRef}
          rows={1}
          value={draft}
        />
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <button
            aria-label="Cancel edit"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            type="button"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
          <button
            aria-label="Save edit"
            className="rounded p-1 text-primary transition-colors hover:bg-primary/10"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            type="button"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5">
      <button
        aria-label="Edit queued message"
        className="absolute inset-0 cursor-text rounded-md"
        onClick={() => setEditing(true)}
        type="button"
      />
      <span className="pointer-events-none flex-1 truncate text-muted-foreground">{item.text}</span>
      <button
        aria-label="Remove queued message"
        className="relative rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-black/5 hover:text-foreground group-hover:opacity-100 dark:hover:bg-white/5"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
      </button>
    </li>
  );
}
