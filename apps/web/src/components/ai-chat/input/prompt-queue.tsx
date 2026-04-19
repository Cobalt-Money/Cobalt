import { Queue } from "@cobalt-web/ui/components/ai-elements/queue";
import { PencilIcon, XIcon } from "lucide-react";
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
    <Queue className="mx-auto w-3/4 rounded-3xl rounded-b-none border-0 shadow-none">
      <div className="flex items-center justify-between px-1">
        <span className="font-medium text-muted-foreground text-sm">
          Queued
        </span>
        <span className="text-muted-foreground text-xs">
          {items.length} waiting
        </span>
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
      <li className="flex items-start gap-1 rounded-md bg-muted px-2 py-1.5">
        <textarea
          className="min-h-[1.5rem] flex-1 resize-none bg-transparent text-foreground text-sm outline-none"
          onBlur={commit}
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
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted">
      <span className="flex-1 truncate text-muted-foreground">{item.text}</span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          aria-label="Edit queued message"
          className="rounded p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          onClick={() => setEditing(true)}
          type="button"
        >
          <PencilIcon className="size-3" />
        </button>
        <button
          aria-label="Remove queued message"
          className="rounded p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          onClick={onRemove}
          type="button"
        >
          <XIcon className="size-3" />
        </button>
      </div>
    </li>
  );
}
