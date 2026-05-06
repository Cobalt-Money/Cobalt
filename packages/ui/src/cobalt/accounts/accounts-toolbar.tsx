import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import { Button } from "@cobalt-web/ui/components/button";

import type { AccountCategory } from "./lib/map-zero-to-account-cards";

export type AccountsFilter = "all" | AccountCategory;

const CATEGORY_LABELS = {
  banking: "Banking",
  brokerage: "Investments",
  credit: "Credit",
  loan: "Loans",
  savings: "Savings",
} satisfies Record<AccountCategory, string>;

const CATEGORY_ORDER: readonly AccountCategory[] = [
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
    <div className="flex w-full min-w-0 flex-col gap-4 bg-sidebar-inset px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <CobaltToggle
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
          </CobaltToggle>
        ))}
      </div>
      {onAddAccount ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="shrink-0"
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
