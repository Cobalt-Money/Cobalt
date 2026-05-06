import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";

import { AmountFilter } from "./filters/amount-filter";
import { CategoryFilter } from "./filters/category-filter";
import type { AmountFilterType } from "./filters/amount-filter";
import { BankFilter } from "./filters/bank-filter";
import type { BankOption } from "./filters/bank-filter";
import { StatusFilter } from "./filters/status-filter";
import type { StatusFilterValue } from "./filters/status-filter";
import { TagFilter } from "./filters/tag-filter";
import type { ExportFormat } from "./lib/export";
import type { TagOption } from "./tags/tag-picker";

export type { BankOption } from "./filters/bank-filter";

export interface TransactionsToolbarFilters {
  amount?: AmountFilterType;
  amountMin?: number;
  amountMax?: number;
  status?: StatusFilterValue;
  bank?: readonly string[];
  tagIds?: readonly string[];
}

export interface TransactionsToolbarProps {
  filters: TransactionsToolbarFilters;
  bankOptions: readonly BankOption[];
  /** Active tags for the filter pill; omit to hide. */
  tagOptions?: readonly TagOption[];
  onFiltersChange: (next: TransactionsToolbarFilters) => void;
  onExport?: (format: ExportFormat) => void;
  onAddTransaction?: () => void;
  onManageTags?: () => void;
  onManageCategories?: () => void;
  selectedCount?: number;
}

export function TransactionsToolbar({
  filters,
  bankOptions,
  tagOptions,
  onFiltersChange,
  onExport,
  onAddTransaction,
  onManageTags,
  onManageCategories,
  selectedCount = 0,
}: TransactionsToolbarProps) {
  const label = selectedCount > 0 ? `Export (${selectedCount})` : "Export all";
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
        {tagOptions && tagOptions.length > 0 ? (
          <TagFilter
            onChange={(tagIds) => {
              onFiltersChange({ ...filters, tagIds });
            }}
            onManage={onManageTags}
            options={tagOptions}
            selectedIds={filters.tagIds ?? []}
          />
        ) : null}
        {onManageCategories ? <CategoryFilter onManage={onManageCategories} /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onAddTransaction ? (
          <Button
            className="shrink-0"
            onClick={onAddTransaction}
            size="sm"
            type="button"
            variant="outline"
          >
            + Add
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="shrink-0" size="sm" type="button" variant="outline">
                {label}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onExport?.("csv");
              }}
            >
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onExport?.("xlsx");
              }}
            >
              Export as Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
