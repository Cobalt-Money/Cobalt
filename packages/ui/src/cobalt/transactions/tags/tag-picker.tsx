"use client";

import { Button } from "@cobalt-web/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Add01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import type { TagColor } from "./palette";
import { TagChip } from "./tag-chip";

export interface TagOption {
  id: string;
  name: string;
  color: TagColor;
}

interface TagPickerProps {
  /** All tags available to the user (active only — caller filters archived). */
  options: TagOption[];
  /** Currently selected tag ids. */
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  /**
   * Fires when user picks "Create <name> tag". Caller opens the
   * `AddTagDialog` (or the command-palette sub-page) seeded with
   * `initialName`. Omit to hide the create row.
   */
  onRequestCreate?: (initialName: string) => void;
  trigger?: React.ReactElement;
  align?: "start" | "center" | "end";
}

/**
 * Multi-select tag picker. Visually matches `CobaltSelectPopover`. Inline tag
 * creation is delegated to a host-rendered dialog/sub-page via
 * `onRequestCreate` — the picker only seeds the name and closes itself.
 */
export function TagPicker({
  align = "start",
  onChange,
  onRequestCreate,
  options,
  selectedIds,
  trigger,
}: TagPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const lowerQuery = query.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      lowerQuery
        ? options.filter((o) => o.name.toLowerCase().includes(lowerQuery))
        : options,
    [lowerQuery, options]
  );
  const exactMatch = options.some((o) => o.name.toLowerCase() === lowerQuery);
  const canCreate =
    Boolean(onRequestCreate) && lowerQuery.length > 0 && !exactMatch;

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function handleCreate() {
    if (!(onRequestCreate && query.trim())) {
      return;
    }
    const name = query.trim();
    setOpen(false);
    setQuery("");
    onRequestCreate(name);
  }

  return (
    <Popover
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          trigger ?? (
            <Button size="sm" variant="outline">
              <HugeiconsIcon className="size-4" icon={Add01Icon} />
              Add tag
            </Button>
          )
        }
      />
      <PopoverContent
        align={align}
        className="w-72 gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)]"
      >
        <div className="flex items-center px-2.5 py-1.5">
          <input
            autoFocus
            className="min-w-0 flex-1 cursor-text bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate && filtered.length === 0) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Search or create…"
            value={query}
          />
        </div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto">
          {filtered.length === 0 && !canCreate ? (
            <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
              No tags
            </div>
          ) : null}
          {filtered.map((opt) => {
            const checked = selectedSet.has(opt.id);
            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
                  checked && "bg-input/30"
                )}
                key={opt.id}
                onClick={() => toggle(opt.id)}
                type="button"
              >
                <TagChip color={opt.color} name={opt.name} size="sm" />
                <span
                  className={cn(
                    "ml-auto flex size-4 items-center justify-center text-foreground",
                    checked ? "opacity-100" : "opacity-0"
                  )}
                >
                  <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
                </span>
              </button>
            );
          })}
          {canCreate ? (
            <>
              {filtered.length > 0 ? (
                <div className="my-1 h-px bg-border/60" />
              ) : null}
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
                onClick={handleCreate}
                type="button"
              >
                <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                  <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                </span>
                <span className="text-foreground">
                  Create <strong>{query.trim()}</strong> tag
                </span>
              </button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
