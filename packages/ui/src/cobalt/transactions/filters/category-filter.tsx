import { CobaltToggle, cobaltToggleSubtleChrome } from "@cobalt-web/ui/cobalt/toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Folder01Icon, Settings02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

export interface CategoryFilterOption {
  id: string;
  name: string;
  groupName?: string | null;
}

interface CategoryFilterProps {
  options?: readonly CategoryFilterOption[];
  selectedIds?: readonly string[];
  onChange?: (next: string[]) => void;
  /** Show "Manage categories" footer; fires when picked. */
  onManage?: () => void;
}

/**
 * Category filter pill mirroring `TagFilter`. Filtering is wired-but-optional
 * — host can omit `options`/`onChange` to render a manage-only dropdown until
 * the table-level filter is wired.
 */
export function CategoryFilter({
  options = [],
  selectedIds = [],
  onChange,
  onManage,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = selectedIds.length > 0;
  const triggerLabel = isActive ? `Categories · ${selectedIds.length}` : "Categories";

  const selectedSet = new Set(selectedIds);

  function toggle(id: string) {
    if (!onChange) {
      return;
    }
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <CobaltToggle
            className={cobaltToggleSubtleChrome}
            pressed={isActive}
            size="sm"
            type="button"
          />
        }
      >
        <HugeiconsIcon className="size-3.5" icon={Folder01Icon} />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command shouldFilter>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No categories.</CommandEmpty>
            {options.length > 0 ? (
              <CommandGroup>
                {options.map((opt) => {
                  const checked = selectedSet.has(opt.id);
                  return (
                    <CommandItem key={opt.id} onSelect={() => toggle(opt.id)} value={opt.name}>
                      <span className="min-w-0 truncate">
                        {opt.groupName ? (
                          <span className="text-muted-foreground">{opt.groupName} · </span>
                        ) : null}
                        {opt.name}
                      </span>
                      <span
                        className={cn(
                          "ml-auto flex size-4 items-center justify-center",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
          </CommandList>
          {onManage ? (
            <div className="border-t p-1">
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-muted-foreground text-sm hover:bg-muted/40 hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
                type="button"
              >
                <HugeiconsIcon className="size-3.5" icon={Settings02Icon} />
                Manage categories
              </button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
