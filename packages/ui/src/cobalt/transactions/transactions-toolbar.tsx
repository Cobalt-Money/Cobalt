import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Add01Icon,
  Calendar03Icon,
  Cancel01Icon,
  DollarCircleIcon,
  Download01Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { InstitutionLogo } from "../logos/institution-logo";
import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "./categories";
import { TagChip } from "./tags/tag-chip";
import { AddFilterMenu } from "./filters/add-filter-menu";
import type { FilterKey } from "./filters/add-filter-menu";
import type { AmountFilterType } from "./filters/amount-filter";
import type { BankOption } from "./filters/bank-filter";
import type { CategoryFilterOption } from "./filters/category-filter";
import type { StatusFilterValue } from "./filters/status-filter";
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
  categoryIds?: readonly string[];
  query?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionsToolbarProps {
  filters: TransactionsToolbarFilters;
  bankOptions: readonly BankOption[];
  /** Active tags for the filter pill; omit to hide. */
  tagOptions?: readonly TagOption[];
  /** Categories for the filter pill; omit to render manage-only dropdown. */
  categoryOptions?: readonly CategoryFilterOption[];
  /** Transactions for counting badge in filter menu. */
  items?: readonly TransactionListItem[];
  onFiltersChange: (next: TransactionsToolbarFilters) => void;
  onExport?: (format: ExportFormat) => void;
  onAddTransaction?: () => void;
  onManageTags?: () => void;
  onManageCategories?: () => void;
}

const STATUS_LABELS: Record<StatusFilterValue, string> = {
  all: "All",
  pending: "Pending",
  posted: "Posted",
};
const STATUS_ICON_SRC: Record<StatusFilterValue, string | null> = {
  all: null,
  pending: "/assets/vectors/pending.svg",
  posted: "/assets/vectors/posted.svg",
};
const AMOUNT_TYPE_LABELS: Record<AmountFilterType, string> = {
  all: "All",
  expense: "Expense",
  income: "Income",
};

const formatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function ExportMenu({ onExport }: { onExport?: (format: ExportFormat) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="shrink-0" size="sm" type="button" variant="outline">
            <HugeiconsIcon className="size-3.5" icon={Download01Icon} strokeWidth={2} />
            Export all
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
  );
}

function buildAmountLabel(filters: TransactionsToolbarFilters): string {
  const parts: string[] = [];
  if (filters.amount && filters.amount !== "all") {
    parts.push(AMOUNT_TYPE_LABELS[filters.amount]);
  }
  if (typeof filters.amountMin === "number" || typeof filters.amountMax === "number") {
    const min = filters.amountMin ?? 0;
    const max = filters.amountMax ?? 10_000;
    parts.push(`${formatter.format(min)}–${formatter.format(max)}`);
  }
  return `Amount: ${parts.join(" · ")}`;
}

function buildDatesLabel(filters: TransactionsToolbarFilters): string {
  if (!(filters.dateFrom || filters.dateTo)) {
    return "";
  }
  if (filters.dateFrom && filters.dateTo) {
    return `Dates: ${filters.dateFrom} → ${filters.dateTo}`;
  }
  if (filters.dateFrom) {
    return `Dates: from ${filters.dateFrom}`;
  }
  return `Dates: until ${filters.dateTo}`;
}

function isAmountActive(f: TransactionsToolbarFilters): boolean {
  return Boolean(
    (f.amount && f.amount !== "all") ||
    typeof f.amountMin === "number" ||
    typeof f.amountMax === "number",
  );
}

interface ToolbarSearchHandle {
  focus: () => void;
}

const ToolbarSearch = forwardRef<
  ToolbarSearchHandle,
  { value: string; onChange: (v: string) => void }
>(function ToolbarSearch({ value, onChange }, ref) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => {
      setExpanded(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    },
  }));
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center overflow-hidden rounded-4xl border border-border bg-input/30 transition-[width] duration-200 hover:bg-input/50",
        expanded ? "w-56" : "w-[5.5rem]",
      )}
    >
      <button
        aria-label="Search"
        className="flex h-full shrink-0 items-center gap-1.5 px-3 text-sm font-medium"
        onClick={() => {
          setExpanded((v) => {
            const next = !v;
            if (next) {
              requestAnimationFrame(() => inputRef.current?.focus());
            }
            return next;
          });
        }}
        type="button"
      >
        <HugeiconsIcon className="size-3.5" icon={SearchIcon} strokeWidth={2} />
        {expanded ? null : <span>Search</span>}
      </button>
      {expanded ? (
        <input
          className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none placeholder:text-muted-foreground"
          onBlur={() => {
            if (!value) {
              setExpanded(false);
            }
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onChange("");
              setExpanded(false);
            }
          }}
          placeholder="Search transactions…"
          ref={inputRef}
          type="search"
          value={value}
        />
      ) : null}
    </div>
  );
});

function FilterChip({
  icon,
  label,
  value,
  onRemove,
}: {
  icon?: typeof Cancel01Icon;
  label?: string;
  value: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center overflow-hidden rounded-4xl border bg-muted/40 text-xs">
      {label ? (
        <>
          <span className="flex items-center gap-1.5 px-2">
            {icon ? (
              <HugeiconsIcon
                className="size-3.5 text-muted-foreground"
                icon={icon}
                strokeWidth={2}
              />
            ) : null}
            <span>{label}</span>
          </span>
          <span className="border-l px-1.5 text-muted-foreground">is</span>
          <span className="flex items-center gap-1 border-l px-2">{value}</span>
        </>
      ) : (
        <span className="flex items-center gap-1.5 px-2">{value}</span>
      )}
      <button
        aria-label={label ? `Remove filter: ${label}` : "Remove filter"}
        className="flex h-full items-center border-l px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <HugeiconsIcon className="size-3" icon={Cancel01Icon} strokeWidth={2} />
      </button>
    </span>
  );
}

// eslint-disable-next-line complexity
export function TransactionsToolbar({
  filters,
  bankOptions,
  tagOptions,
  categoryOptions,
  items,
  onFiltersChange,
  onExport,
  onAddTransaction,
  onManageTags: _onManageTags,
  onManageCategories,
}: TransactionsToolbarProps) {
  const searchRef = useRef<ToolbarSearchHandle>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const amountActive = isAmountActive(filters);
  const statusActive = Boolean(filters.status && filters.status !== "all");
  const bankActive = Boolean(filters.bank && filters.bank.length > 0);
  const tagActive = Boolean(filters.tagIds && filters.tagIds.length > 0);
  const categoryActive = Boolean(filters.categoryIds && filters.categoryIds.length > 0);
  const datesActive = Boolean(filters.dateFrom || filters.dateTo);

  const showTags = Boolean(tagOptions && tagOptions.length > 0);
  const showCategory = Boolean(
    onManageCategories || (categoryOptions && categoryOptions.length > 0),
  );

  const available: FilterKey[] = ["amount", "status", "bank"];
  if (showTags) {
    available.push("tag");
  }
  if (showCategory) {
    available.push("category");
  }
  available.push("dates");

  const amountLabel = buildAmountLabel(filters);
  const datesLabel = buildDatesLabel(filters);

  const anyFilterActive =
    amountActive || statusActive || bankActive || tagActive || categoryActive || datesActive;
  const clearAll = () => {
    onFiltersChange({
      ...filters,
      amount: undefined,
      amountMax: undefined,
      amountMin: undefined,
      bank: undefined,
      categoryIds: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      tagIds: undefined,
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col bg-sidebar-inset">
      <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <ToolbarSearch
            onChange={(v) => onFiltersChange({ ...filters, query: v })}
            ref={searchRef}
            value={filters.query ?? ""}
          />
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
              <HugeiconsIcon className="size-3.5" icon={Add01Icon} strokeWidth={2} />
              Add
            </Button>
          ) : null}
          <AddFilterMenu
            items={items}
            amount={{
              max: filters.amountMax,
              min: filters.amountMin,
              type: filters.amount ?? "all",
            }}
            available={available}
            bankIds={filters.bank ?? []}
            bankOptions={bankOptions}
            categoryIds={filters.categoryIds ?? []}
            categoryOptions={categoryOptions}
            onChangeAmount={(next) => {
              onFiltersChange({
                ...filters,
                amount: next.type,
                amountMax: next.max,
                amountMin: next.min,
              });
            }}
            onChangeBanks={(bank) => {
              onFiltersChange({ ...filters, bank });
            }}
            onChangeCategories={(categoryIds) => {
              onFiltersChange({ ...filters, categoryIds });
            }}
            onChangeStatus={(status) => {
              onFiltersChange({ ...filters, status });
            }}
            onChangeTags={(tagIds) => {
              onFiltersChange({ ...filters, tagIds });
            }}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChangeDates={(dateFrom, dateTo) => {
              onFiltersChange({ ...filters, dateFrom, dateTo });
            }}
            status={filters.status ?? "all"}
            tagIds={filters.tagIds ?? []}
            tagOptions={tagOptions}
          />
          <ExportMenu onExport={onExport} />
        </div>
      </div>
      {anyFilterActive ? (
        <ActiveFilterChips
          amountActive={amountActive}
          amountLabel={amountLabel}
          bankActive={bankActive}
          bankOptions={bankOptions}
          categoryActive={categoryActive}
          categoryOptions={categoryOptions}
          clearAll={clearAll}
          datesActive={datesActive}
          datesLabel={datesLabel}
          filters={filters}
          onFiltersChange={onFiltersChange}
          statusActive={statusActive}
          tagActive={tagActive}
          tagOptions={tagOptions}
        />
      ) : null}
    </div>
  );
}

interface ActiveFilterChipsProps {
  amountActive: boolean;
  amountLabel: string;
  bankActive: boolean;
  bankOptions: readonly BankOption[];
  categoryActive: boolean;
  categoryOptions?: readonly CategoryFilterOption[];
  clearAll: () => void;
  datesActive: boolean;
  datesLabel: string;
  filters: TransactionsToolbarFilters;
  onFiltersChange: (next: TransactionsToolbarFilters) => void;
  statusActive: boolean;
  tagActive: boolean;
  tagOptions?: readonly TagOption[];
}

function ActiveFilterChips({
  amountActive,
  amountLabel,
  bankActive,
  bankOptions,
  categoryActive,
  categoryOptions,
  clearAll,
  datesActive,
  datesLabel,
  filters,
  onFiltersChange,
  statusActive,
  tagActive,
  tagOptions,
}: ActiveFilterChipsProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 px-4 pb-3 lg:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {amountActive ? (
          <FilterChip
            onRemove={() => {
              onFiltersChange({
                ...filters,
                amount: undefined,
                amountMax: undefined,
                amountMin: undefined,
              });
            }}
            value={
              <>
                <HugeiconsIcon
                  className="size-3.5 text-muted-foreground"
                  icon={DollarCircleIcon}
                  strokeWidth={2}
                />
                <span>{amountLabel.replace(/^Amount: /, "")}</span>
              </>
            }
          />
        ) : null}
        {statusActive ? (
          <FilterChip
            onRemove={() => onFiltersChange({ ...filters, status: undefined })}
            value={(() => {
              const s = filters.status as StatusFilterValue;
              const src = STATUS_ICON_SRC[s];
              return (
                <>
                  {src ? (
                    <img
                      alt=""
                      className="size-4 shrink-0 object-contain"
                      decoding="async"
                      height={16}
                      src={src}
                      width={16}
                    />
                  ) : null}
                  <span>{STATUS_LABELS[s]}</span>
                </>
              );
            })()}
          />
        ) : null}
        {bankActive
          ? filters.bank?.map((id) => {
              const opt = bankOptions.find((o) => o.id === id);
              return (
                <FilterChip
                  key={id}
                  onRemove={() =>
                    onFiltersChange({
                      ...filters,
                      bank: filters.bank?.filter((b) => b !== id) ?? [],
                    })
                  }
                  value={
                    opt ? (
                      <>
                        <InstitutionLogo
                          institutionLogo={opt.logo}
                          institutionName={opt.name}
                          institutionUrl={opt.url}
                        />
                        <span>{opt.name}</span>
                      </>
                    ) : (
                      id
                    )
                  }
                />
              );
            })
          : null}
        {tagActive
          ? filters.tagIds?.map((id) => {
              const opt = tagOptions?.find((o) => o.id === id);
              return (
                <FilterChip
                  key={id}
                  onRemove={() =>
                    onFiltersChange({
                      ...filters,
                      tagIds: filters.tagIds?.filter((t) => t !== id) ?? [],
                    })
                  }
                  value={opt ? <TagChip color={opt.color} name={opt.name} size="sm" /> : id}
                />
              );
            })
          : null}
        {categoryActive
          ? filters.categoryIds?.map((id) => {
              const opt = categoryOptions?.find((o) => o.id === id);
              const icon = resolveCategoryIcon(opt?.iconKey ?? null) ?? UNKNOWN_CATEGORY_ICON;
              return (
                <FilterChip
                  key={id}
                  onRemove={() =>
                    onFiltersChange({
                      ...filters,
                      categoryIds: filters.categoryIds?.filter((c) => c !== id) ?? [],
                    })
                  }
                  value={
                    opt ? (
                      <>
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          <CategoryIcon icon={icon} sizeClassName="size-4" />
                        </span>
                        <span>{opt.name}</span>
                      </>
                    ) : (
                      id
                    )
                  }
                />
              );
            })
          : null}
        {datesActive ? (
          <FilterChip
            onRemove={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
            value={
              <>
                <HugeiconsIcon
                  className="size-3.5 text-muted-foreground"
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
                <span>{datesLabel.replace(/^Dates: /, "")}</span>
              </>
            }
          />
        ) : null}
      </div>
      <button
        className="shrink-0 text-muted-foreground text-xs hover:text-foreground"
        onClick={clearAll}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}
