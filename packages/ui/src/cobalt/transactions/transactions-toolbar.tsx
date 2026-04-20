import { Button } from "@cobalt-web/ui/components/button";

import { AmountFilter } from "./filters/amount-filter";
import type { AmountFilterType } from "./filters/amount-filter";
import { BankFilter } from "./filters/bank-filter";
import type { BankOption } from "./filters/bank-filter";
import { StatusFilter } from "./filters/status-filter";
import type { StatusFilterValue } from "./filters/status-filter";

export type { BankOption } from "./filters/bank-filter";

export interface TransactionsToolbarFilters {
  amount?: AmountFilterType;
  amountMin?: number;
  amountMax?: number;
  status?: StatusFilterValue;
  bank?: readonly string[];
}

export interface TransactionsToolbarProps {
  filters: TransactionsToolbarFilters;
  bankOptions: readonly BankOption[];
  onFiltersChange: (next: TransactionsToolbarFilters) => void;
}

export function TransactionsToolbar({
  filters,
  bankOptions,
  onFiltersChange,
}: TransactionsToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 bg-sidebar-inset px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AmountFilter
          onChange={(next) => {
            onFiltersChange({
              ...filters,
              amount: next.type,
              amountMax: next.max,
              amountMin: next.min,
            });
          }}
          value={{
            max: filters.amountMax,
            min: filters.amountMin,
            type: filters.amount ?? "all",
          }}
        />
        <StatusFilter
          onChange={(status) => {
            onFiltersChange({ ...filters, status });
          }}
          value={filters.status ?? "all"}
        />
        <BankFilter
          onChange={(bank) => {
            onFiltersChange({ ...filters, bank });
          }}
          options={bankOptions}
          value={filters.bank ?? []}
        />
      </div>
      <Button className="shrink-0" size="sm" type="button" variant="outline">
        Export
      </Button>
    </div>
  );
}
