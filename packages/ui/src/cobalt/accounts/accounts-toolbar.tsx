import { Toggle } from "@cobalt-web/ui/components/toggle";
import { Button } from "@cobalt-web/ui/components/button";

import type { AccountCategory } from "./lib/map-zero-to-account-cards";

export type AccountsFilter = "all" | AccountCategory;

const CATEGORY_LABELS = {
  banking: "Banking",
  brokerage: "Investments",
  cash: "Cash",
  credit: "Credit",
  loan: "Loans",
  savings: "Savings",
} satisfies Record<AccountCategory, string>;

const CATEGORY_ORDER: readonly AccountCategory[] = [
  "cash",
  "banking",
  "savings",
  "brokerage",
  "credit",
  "loan",
];

const FILTERS: { value: AccountsFilter; label: string }[] = [
  { label: "All", value: "all" },
  ...CATEGORY_ORDER.map((value) => ({ label: CATEGORY_LABELS[value], value })),
];

export function AccountsToolbar({
  activeFilter,
  onFilterChange,
  onAddAccount,
}: {
  activeFilter: AccountsFilter;
  onFilterChange: (v: AccountsFilter) => void;
  onAddAccount?: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 bg-sidebar-inset px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Toggle
            key={f.value}
            pressed={activeFilter === f.value}
            onPressedChange={(pressed) => {
              if (pressed) {
                onFilterChange(f.value);
              }
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {f.label}
          </Toggle>
        ))}
      </div>
      {onAddAccount ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="shrink-0 font-normal"
            onClick={onAddAccount}
            size="sm"
            type="button"
            variant="outline"
          >
            + Add account
          </Button>
        </div>
      ) : null}
    </div>
  );
}
