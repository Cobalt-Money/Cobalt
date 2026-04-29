import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

export interface CobaltSelectPopoverProps<TItem> {
  /** Trigger element. Passed to `PopoverTrigger` `render` prop. */
  trigger: ReactElement;
  items: readonly TItem[];
  /** Stable key per item. */
  itemKey: (item: TItem) => string;
  /** Free-form search predicate; receives lowercased query. */
  itemMatch: (item: TItem, query: string) => boolean;
  /** Renders the icon column (left). Returning `null` collapses gutter. */
  renderIcon?: (item: TItem) => ReactNode;
  /** Renders the label / right-side content. */
  renderLabel: (item: TItem) => ReactNode;
  /** Currently selected key (for `aria-selected` styling). Optional. */
  selectedKey?: string | null;
  onSelect: (item: TItem) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Tailwind width override for the popover content. Defaults to `w-64`. */
  contentClassName?: string;
}

/**
 * Searchable single-select dropdown built on a static-position Popover (no
 * Combobox-style reflow). Search input shares the same icon-column gutter as
 * the list rows so its text aligns with item text.
 *
 * Reused by category, account, future tag pickers — keep the API stable.
 */
export function CobaltSelectPopover<TItem>({
  trigger,
  items,
  itemKey,
  itemMatch,
  renderIcon,
  renderLabel,
  selectedKey,
  onSelect,
  searchPlaceholder = "Search…",
  emptyText = "No results",
  contentClassName,
}: CobaltSelectPopoverProps<TItem>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      return items;
    }
    return items.filter((item) => itemMatch(item, q));
  }, [items, itemMatch, query]);

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
        className={cn(
          "gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)]",
          contentClassName ?? "w-64"
        )}
      >
        <div className="flex items-center px-2.5 py-1.5">
          <input
            autoFocus
            className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder={searchPlaceholder}
            value={query}
          />
        </div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
              {emptyText}
            </div>
          ) : (
            filtered.map((item) => {
              const key = itemKey(item);
              const isSelected = selectedKey === key;
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
                    isSelected && "bg-input/30 font-medium"
                  )}
                  key={key}
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                  }}
                  type="button"
                >
                  {renderIcon ? (
                    <span className="flex size-5 shrink-0 items-center justify-center">
                      {renderIcon(item)}
                    </span>
                  ) : null}
                  {renderLabel(item)}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
