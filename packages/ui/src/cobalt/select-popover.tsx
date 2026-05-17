import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

export interface CobaltSelectPopoverProps<TItem> {
  /** Trigger element. Passed to `PopoverTrigger` `render` prop. */
  trigger: ReactElement;
  items: readonly TItem[];
  /** Stable key per item. */
  itemKey: (item: TItem) => string;
  /**
   * Free-form search predicate; receives lowercased query. Used for client-side
   * filtering of a static `items` list. Omit when `onQueryChange` is supplied —
   * the parent then owns search and provides already-filtered `items`.
   */
  itemMatch?: (item: TItem, query: string) => boolean;
  /**
   * Called on every query change. When set, the component skips client-side
   * filtering — the parent is expected to fetch + supply matching `items`
   * (e.g. an async typeahead).
   */
  onQueryChange?: (query: string) => void;
  /**
   * When set, a "Use «query»" row is shown while the query is non-empty so the
   * user can commit a free-text value not present in `items`.
   */
  onUseCustom?: (query: string) => void;
  /**
   * When set, items are bucketed under group headers (e.g. by institution).
   * Groups render in first-seen order; the predicate returns the group label.
   */
  groupBy?: (item: TItem) => string;
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
  /** Optional content rendered below the list, separated by a divider (e.g. toggles, sub-options). */
  footer?: ReactNode;
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
  onQueryChange,
  onUseCustom,
  groupBy,
  renderIcon,
  renderLabel,
  selectedKey,
  onSelect,
  searchPlaceholder = "Search…",
  emptyText = "No results",
  contentClassName,
  footer,
}: CobaltSelectPopoverProps<TItem>) {
  const [query, setQuery] = useState("");

  const setQueryAndNotify = (next: string) => {
    setQuery(next);
    onQueryChange?.(next);
  };

  const filtered = useMemo(() => {
    // Parent-driven search: `items` are already filtered, don't re-filter here.
    if (onQueryChange) {
      return items;
    }
    const q = query.trim().toLowerCase();
    if (q === "" || !itemMatch) {
      return items;
    }
    return items.filter((item) => itemMatch(item, q));
  }, [items, itemMatch, onQueryChange, query]);

  // Bucket into [groupLabel, items][] when `groupBy` is set; groups alphabetized.
  const grouped = useMemo(() => {
    if (!groupBy) {
      return null;
    }
    const map = new Map<string, TItem[]>();
    for (const item of filtered) {
      const label = groupBy(item);
      const bucket = map.get(label);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(label, [item]);
      }
    }
    return [...map.entries()].toSorted(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const trimmedQuery = query.trim();

  const renderRow = (item: TItem) => {
    const key = itemKey(item);
    const isSelected = selectedKey === key;
    return (
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
          isSelected && "bg-input/30 font-medium",
        )}
        key={key}
        onClick={() => {
          onSelect(item);
          setQueryAndNotify("");
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
  };

  return (
    <Popover
      onOpenChange={(o) => {
        if (!o) {
          setQueryAndNotify("");
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="start"
        className={cn("gap-0 bg-popover p-1 dark:bg-popover", contentClassName ?? "w-64")}
      >
        <div className="flex items-center px-2.5 py-1.5">
          <input
            autoFocus
            className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQueryAndNotify(e.target.value);
            }}
            placeholder={searchPlaceholder}
            value={query}
          />
        </div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto">
          {onUseCustom && trimmedQuery !== "" ? (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
              onClick={() => {
                onUseCustom(trimmedQuery);
                setQueryAndNotify("");
              }}
              type="button"
            >
              Use &quot;{trimmedQuery}&quot;
            </button>
          ) : null}
          {(() => {
            if (filtered.length === 0 && !(onUseCustom && trimmedQuery !== "")) {
              return (
                <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
                  {emptyText}
                </div>
              );
            }
            if (grouped) {
              return grouped.map(([label, groupItems]) => (
                <div key={label}>
                  <div className="px-2.5 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {label}
                  </div>
                  {groupItems.map(renderRow)}
                </div>
              ));
            }
            return filtered.map(renderRow);
          })()}
        </div>
        {footer ? <div className="mt-1 border-t border-border/50 pt-1">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
