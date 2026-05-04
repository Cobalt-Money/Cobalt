import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import {
  CategoryIcon,
  resolveCategoryIcon,
  resolveGroupIcon,
  UNKNOWN_CATEGORY_ICON,
} from "../categories";
import type { CategoryPickerOption } from "./editable-category";

interface CategoryPickerProps {
  trigger: ReactElement;
  options: readonly CategoryPickerOption[];
  selectedKey: string | null;
  onSelect: (option: CategoryPickerOption) => void;
}

/**
 * Sectioned category picker. Two-level: group headers + indented cat rows.
 * When searching, flattens to "Group › Cat" rows for context.
 */
export function CategoryPicker({
  trigger,
  options,
  selectedKey,
  onSelect,
}: CategoryPickerProps) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { groupName: string; items: CategoryPickerOption[] }
    >();
    for (const opt of options) {
      const key = opt.groupSystemKey ?? "_ungrouped";
      const bucket = map.get(key);
      if (bucket) {
        bucket.items.push(opt);
      } else {
        map.set(key, { groupName: opt.groupName, items: [opt] });
      }
    }
    return [...map.entries()];
  }, [options]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      return null;
    }
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.groupName.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <Popover
      onOpenChange={(o) => {
        if (!o) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="start"
        className="w-72 gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)]"
      >
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
          {searched && searched.length === 0 ? (
            <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
              No categories
            </div>
          ) : null}
          {searched && searched.length > 0
            ? searched.map((opt) => (
                <CategoryRow
                  flat
                  isSelected={opt.id === selectedKey}
                  key={opt.id}
                  onSelect={() => {
                    onSelect(opt);
                    setQuery("");
                  }}
                  option={opt}
                />
              ))
            : null}
          {searched
            ? null
            : grouped.map(([groupKey, { groupName, items }]) => (
                <div key={groupKey}>
                  <div className="flex items-center gap-2 px-2.5 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <CategoryIcon
                        icon={
                          resolveGroupIcon(groupKey) ?? UNKNOWN_CATEGORY_ICON
                        }
                        sizeClassName="size-4"
                      />
                    </span>
                    {groupName}
                  </div>
                  {items.map((opt) => (
                    <CategoryRow
                      flat={false}
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
              ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CategoryRow({
  option,
  isSelected,
  onSelect,
  flat,
}: {
  option: CategoryPickerOption;
  isSelected: boolean;
  onSelect: () => void;
  /** When true, show "Group › Cat" inline (search mode); else just cat name (grouped mode). */
  flat: boolean;
}) {
  const icon = resolveCategoryIcon(option.iconKey) ?? UNKNOWN_CATEGORY_ICON;
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
        flat ? "" : "pl-6",
        isSelected && "bg-input/30 font-medium"
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <CategoryIcon icon={icon} sizeClassName="size-5" />
      </span>
      {flat ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground">
            {option.groupName}
          </span>
          <HugeiconsIcon
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground"
            icon={ArrowRight01Icon}
            strokeWidth={2}
          />
          <span className="min-w-0 truncate text-foreground">
            {option.name}
          </span>
        </span>
      ) : (
        <span className="min-w-0 truncate text-foreground">{option.name}</span>
      )}
    </button>
  );
}
