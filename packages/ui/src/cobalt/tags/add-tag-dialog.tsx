import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { CobaltDialog } from "../cobalt-dialog";
import type { TagColor } from "./palette";
import { DEFAULT_TAG_COLOR, TAG_COLOR_HEX, TAG_COLORS } from "./palette";
import { TagChip } from "./tag-chip";

export interface AddTagFormValues {
  name: string;
  color: TagColor;
}

export interface AddTagFormProps {
  onSubmit: (values: AddTagFormValues) => void;
  submitting?: boolean;
  /** Pre-fill name (e.g. typed in tag picker before invoking create). */
  initialName?: string;
  /** Fires when user hits Backspace with empty name. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function AddTagForm({
  autoFocus = true,
  initialName = "",
  onBackspaceWhenEmpty,
  onSubmit,
  submitLabel = "Create tag",
  submitting = false,
}: AddTagFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<TagColor>(DEFAULT_TAG_COLOR);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(initialName);
    setColor(DEFAULT_TAG_COLOR);
    if (!autoFocus) {
      return;
    }
    let secondId = 0;
    const id = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (secondId) {
        window.cancelAnimationFrame(secondId);
      }
    };
  }, [autoFocus, initialName]);

  const trimmed = name.trim();
  const canSubmit = !submitting && trimmed.length > 0 && trimmed.length <= 50;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({ color, name: trimmed });
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <input
        aria-label="Tag name"
        className="w-full min-w-0 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
        maxLength={50}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && name === "" && onBackspaceWhenEmpty) {
            e.preventDefault();
            onBackspaceWhenEmpty();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Business, Travel, Reimbursable…"
        ref={titleRef}
        value={name}
      />

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Color
        </p>
        <div className="grid w-fit grid-cols-8 gap-2">
          {TAG_COLORS.map((c) => (
            <button
              aria-label={c}
              aria-pressed={c === color}
              className={cn(
                "size-7 rounded-full border transition",
                c === color
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                  : "border-border hover:scale-110"
              )}
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: TAG_COLOR_HEX[c] }}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <span className="text-muted-foreground text-sm">Preview:</span>
        <TagChip color={color} name={trimmed || "Tag name"} />
      </div>

      <div className="mt-auto flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Creating…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddTagFormValues) => void;
  submitting?: boolean;
  initialName?: string;
  onBackspaceWhenEmpty?: () => void;
}

export function AddTagDialog({
  initialName,
  onBackspaceWhenEmpty,
  onOpenChange,
  onSubmit,
  open,
  submitting = false,
}: AddTagDialogProps) {
  return (
    <CobaltDialog
      className="min-h-[280px] w-[460px] sm:max-w-lg"
      onOpenChange={onOpenChange}
      open={open}
      title="New Tag"
      titleIcon={Tag01Icon}
      titleIconClassName="size-5"
    >
      <AddTagForm
        initialName={initialName}
        key={open ? `open-${initialName ?? ""}` : "closed"}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </CobaltDialog>
  );
}
