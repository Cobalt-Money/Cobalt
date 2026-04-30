import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Settings02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { TagChip } from "../../tags/tag-chip";
import type { TagOption } from "../../tags/tag-picker";

interface TagFilterProps {
  options: readonly TagOption[];
  selectedIds: readonly string[];
  onChange: (next: string[]) => void;
  /** Show "Manage tags" footer; fires when picked. */
  onManage?: () => void;
}

/** Multi-select tag filter pill. Matches `status-filter.tsx` shape. */
export function TagFilter({
  onChange,
  onManage,
  options,
  selectedIds,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = selectedIds.length > 0;
  const triggerLabel = isActive ? `Tags · ${selectedIds.length}` : "Tags";

  const selectedSet = new Set(selectedIds);

  function toggle(id: string) {
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
            pressed={isActive}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command shouldFilter>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags.</CommandEmpty>
            {options.length > 0 ? (
              <CommandGroup>
                {options.map((opt) => {
                  const checked = selectedSet.has(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      onSelect={() => toggle(opt.id)}
                      value={opt.name}
                    >
                      <TagChip color={opt.color} name={opt.name} size="sm" />
                      <span
                        className={cn(
                          "ml-auto flex size-4 items-center justify-center",
                          checked ? "opacity-100" : "opacity-0"
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
                Manage tags
              </button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
