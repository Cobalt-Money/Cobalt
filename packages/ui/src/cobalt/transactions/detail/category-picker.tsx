import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import type { CategoryPickerOption } from "./editable-category";

interface CategoryPickerProps {
  trigger: ReactElement;
  options: readonly CategoryPickerOption[];
  selectedKey: string | null;
  onSelect: (option: CategoryPickerOption) => void;
  /** Optional: render "+ New category" row at bottom; fires this when clicked. */
  onCreateCategory?: () => void;
}

/**
 * Group-scoped category picker. Single-level: group header + cat rows.
 * Optional "+ New category" footer.
 */
export function CategoryPicker({
  trigger,
  options,
  selectedKey,
  onSelect,
  onCreateCategory,
}: CategoryPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      return options;
    }
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.groupName.toLowerCase().includes(q),
    );
  }, [options, query]);

  const groups = useMemo(() => {
    const map = new Map<string, { groupName: string; items: CategoryPickerOption[] }>();
    for (const opt of filtered) {
      const key = `${opt.groupSystemKey ?? "_custom"}::${opt.groupName}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.items.push(opt);
      } else {
        map.set(key, { groupName: opt.groupName || "Other", items: [opt] });
      }
    }
    return [...map.values()];
  }, [filtered]);

  return (
    <Popover
      onOpenChange={(o) => {
        if (!o) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-72 gap-0 bg-popover p-1 dark:bg-popover">
        <div className="flex items-center px-2.5 py-1.5">
          <input
            autoFocus
            className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search categories…"
            value={query}
          />
        </div>
        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
              No categories
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.groupName}>
                <div className="px-2.5 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {g.groupName}
                </div>
                {g.items.map((opt) => (
                  <CategoryRow
                    isSelected={opt.id === selectedKey}
                    key={opt.id}
                    onSelect={() => {
                      onSelect(opt);
                      setQuery("");
                    }}
                    option={opt}
                  />
                ))}
              </div>
            ))
          )}
        </div>
        {onCreateCategory ? (
          <>
            <div className="my-1 border-foreground/10 border-t" />
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-input/40"
              onClick={() => {
                onCreateCategory();
                setQuery("");
              }}
              type="button"
            >
              <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 truncate">
                {query.trim() === "" ? "New category" : `New category “${query.trim()}”`}
              </span>
            </button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function CategoryRow({
  option,
  isSelected,
  onSelect,
}: {
  option: CategoryPickerOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const icon = resolveCategoryIcon(option.iconKey) ?? UNKNOWN_CATEGORY_ICON;
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
        isSelected && "bg-input/30 font-medium",
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <CategoryIcon icon={icon} sizeClassName="size-5" />
      </span>
      <span className="min-w-0 truncate text-foreground">{option.name}</span>
    </button>
  );
}
