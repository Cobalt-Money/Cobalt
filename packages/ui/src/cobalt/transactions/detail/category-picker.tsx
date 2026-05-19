import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import type { CategoryPickerOption } from "./editable-category";

interface CategoryPickerListProps {
  options: readonly CategoryPickerOption[];
  selectedKey: string | null;
  onSelect: (option: CategoryPickerOption) => void;
  /** Optional: render "+ New category" row at bottom; fires this when clicked. */
  onCreateCategory?: () => void;
  /** Optional: render "Don't import" row at bottom; fires this when clicked. */
  onSkip?: () => void;
  /** Popover hosts want the search focused on open; menu sub-content does not. */
  autoFocusSearch?: boolean;
}

/**
 * Search + grouped category list. Host-agnostic body shared by the standalone
 * {@link CategoryPicker} popover and the transactions table's context menu, so
 * the picker looks identical wherever it appears.
 */
export function CategoryPickerList({
  options,
  selectedKey,
  onSelect,
  onCreateCategory,
  onSkip,
  autoFocusSearch = true,
}: CategoryPickerListProps) {
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
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          placeholder="Search categories…"
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-80 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No categories</div>
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
      {onCreateCategory || onSkip ? <div className="my-1 border-foreground/10 border-t" /> : null}
      {onCreateCategory ? (
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
      ) : null}
      {onSkip ? (
        <button
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-muted-foreground text-sm transition-colors hover:bg-input/40 hover:text-foreground"
          onClick={() => {
            onSkip();
            setQuery("");
          }}
          type="button"
        >
          <span className="flex size-5 shrink-0 items-center justify-center">
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0 truncate">Don't import these rows</span>
        </button>
      ) : null}
    </>
  );
}

interface CategoryPickerProps {
  trigger: ReactElement;
  options: readonly CategoryPickerOption[];
  selectedKey: string | null;
  onSelect: (option: CategoryPickerOption) => void;
  /** Optional: render "+ New category" row at bottom; fires this when clicked. */
  onCreateCategory?: () => void;
  /** Optional: render "Don't import" row at bottom; fires this when clicked. */
  onSkip?: () => void;
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
  onSkip,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto gap-0 bg-popover p-1 dark:bg-popover">
        <CategoryPickerList
          onCreateCategory={
            onCreateCategory
              ? () => {
                  onCreateCategory();
                  setOpen(false);
                }
              : undefined
          }
          onSelect={(opt) => {
            onSelect(opt);
            setOpen(false);
          }}
          onSkip={
            onSkip
              ? () => {
                  onSkip();
                  setOpen(false);
                }
              : undefined
          }
          options={options}
          selectedKey={selectedKey}
        />
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
