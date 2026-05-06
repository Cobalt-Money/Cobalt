import { CobaltDialog } from "@cobalt-web/ui/cobalt/cobalt-dialog";
import { Button } from "@cobalt-web/ui/components/button";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerSearch,
} from "@cobalt-web/ui/components/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ViewOffIcon, Folder02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import { useCreateCategory } from "@/hooks/use-categories";
import type { GroupRow } from "@/hooks/use-categories";

export interface CategoryFormInitial {
  /** Pre-select group when invoked from a group's "+ New" button. */
  groupId?: string;
  iconKey?: string;
  name?: string;
  excludeFromInsights?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: readonly GroupRow[];
  initial: CategoryFormInitial | null;
}

export function CategoryFormDialog({ open, onOpenChange, groups, initial }: Props) {
  const createCat = useCreateCategory();

  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState("");
  const [groupId, setGroupId] = useState("");
  const [excludeFromInsights, setExcludeFromInsights] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initial?.name ?? "");
    setIconKey(initial?.iconKey ?? "");
    setGroupId(initial?.groupId ?? "");
    setExcludeFromInsights(initial?.excludeFromInsights ?? false);
    let secondId = 0;
    const id = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (secondId) {
        window.cancelAnimationFrame(secondId);
      }
    };
  }, [open, initial, groups]);

  const trimmed = name.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= 50 && iconKey.trim().length > 0 && groupId !== "";

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    createCat({ groupId, iconKey: iconKey.trim(), name: trimmed });
    onOpenChange(false);
  };

  const groupName = groups.find((g) => g.id === groupId)?.name ?? "Select group";

  return (
    <CobaltDialog
      className="min-h-[260px] w-[460px] sm:max-w-lg"
      footer={
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          Create category
        </Button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="New category"
    >
      <div className="flex items-baseline gap-3">
        <Popover onOpenChange={setEmojiOpen} open={emojiOpen}>
          <PopoverTrigger
            render={
              <button
                aria-label="Pick icon"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-md text-2xl outline-none transition-colors",
                  iconKey
                    ? "bg-transparent hover:bg-input/40"
                    : "border border-dashed border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                type="button"
              >
                {iconKey || "+"}
              </button>
            }
          />
          <PopoverContent align="start" className="w-fit p-0">
            <EmojiPicker
              onEmojiSelect={({ emoji }) => {
                setIconKey(emoji);
                setEmojiOpen(false);
              }}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
            </EmojiPicker>
          </PopoverContent>
        </Popover>
        <input
          aria-label="Category name"
          className="min-w-0 flex-1 cursor-text bg-transparent font-medium text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Coffee, Rent, Groceries…"
          ref={nameRef}
          value={name}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
        <Popover>
          <PopoverTrigger
            render={
              <button
                className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-input/40 px-2 text-foreground text-xs transition-colors hover:bg-input/60"
                type="button"
              >
                <HugeiconsIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  icon={Folder02Icon}
                  strokeWidth={2}
                />
                {groupName}
              </button>
            }
          />
          <PopoverContent align="start" className="w-56 p-1">
            <div className="flex max-h-64 flex-col overflow-y-auto">
              {groups.map((g) => (
                <button
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
                    g.id === groupId && "bg-input/40 text-foreground",
                  )}
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  {g.id === groupId ? (
                    <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
                  ) : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <button
          aria-pressed={excludeFromInsights}
          className={cn(
            "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
            excludeFromInsights
              ? "border-foreground/15 bg-input/40 text-foreground"
              : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
          )}
          onClick={() => setExcludeFromInsights((v) => !v)}
          type="button"
        >
          <HugeiconsIcon className="size-3.5 shrink-0" icon={ViewOffIcon} strokeWidth={2} />
          {excludeFromInsights ? "Excluded from insights" : "Include in insights"}
        </button>
      </div>
    </CobaltDialog>
  );
}
