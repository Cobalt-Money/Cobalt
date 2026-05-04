import { cn } from "@cobalt-web/ui/lib/utils";

import type { AccountCategory } from "./lib/map-zero-to-account-cards";

export type AccountsFilter = "all" | AccountCategory;

const FILTERS: { value: AccountsFilter; label: string }[] = [
  { label: "All", value: "all" },
  { label: "Banking", value: "banking" },
  { label: "Investments", value: "brokerage" },
  { label: "Credit", value: "credit" },
];

export function AccountsToolbar({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: AccountsFilter;
  onFilterChange: (v: AccountsFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border/50 px-4 lg:px-6">
      {FILTERS.map((f, index) => {
        const isFirst = index === 0;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "relative py-2 text-sm font-medium transition-colors",
              isFirst ? "pl-0 pr-3" : "px-3",
              activeFilter === f.value
                ? cn(
                    "text-foreground after:absolute after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground",
                    isFirst ? "after:left-0 after:right-3" : "after:inset-x-3",
                  )
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
