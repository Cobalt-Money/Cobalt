import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Checkbox } from "@cobalt-web/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@cobalt-web/ui/components/table";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, RowSelectionState } from "@tanstack/react-table";
import type { MouseEvent, KeyboardEvent } from "react";
import { Fragment, useCallback, useMemo, useState } from "react";

import { InstitutionLogo } from "../logos/institution-logo";
import { MerchantLogo } from "../logos/merchant-logo";
import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "./categories";
import {
  formatMonthGroupLabel,
  formatTransactionDateDisplay,
  transactionDateSortKey,
  transactionMonthGroupKey,
} from "./lib/helpers";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const STATUS_PENDING_ICON = "/assets/vectors/pending.svg";
const STATUS_POSTED_ICON = "/assets/vectors/posted.svg";

function truncateName(name: string, max = 40): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max)}…`;
}

/** Keeps every column vertically centered on a shared line height. */
const cellRow = "flex items-center leading-5";

/**
 * Insert sticky month sections (Linear-style) while preserving TanStack row order & selection.
 * Group key uses the same calendar month as the Date column.
 */
function groupRowsByMonth(
  rows: Row<TransactionListItem>[]
): { label: string; monthKey: string; rows: Row<TransactionListItem>[] }[] {
  const groups: {
    label: string;
    monthKey: string;
    rows: Row<TransactionListItem>[];
  }[] = [];

  for (const row of rows) {
    const monthKey = transactionMonthGroupKey(row.original);
    const last = groups.at(-1);
    if (!last || last.monthKey !== monthKey) {
      groups.push({
        label: formatMonthGroupLabel(monthKey),
        monthKey,
        rows: [row],
      });
    } else {
      last.rows.push(row);
    }
  }
  return groups;
}

function getColumnStableId(col: ColumnDef<TransactionListItem>): string {
  if (typeof col.id === "string" && col.id.length > 0) {
    return col.id;
  }
  if ("accessorKey" in col && typeof col.accessorKey === "string") {
    return col.accessorKey;
  }
  return "";
}

const monthDividerBase = "bg-muted font-medium text-foreground";

const columns: ColumnDef<TransactionListItem>[] = [
  {
    cell: ({ row }) => (
      <div
        className={cn(
          cellRow,
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          row.getIsSelected() && "opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        role="presentation"
      >
        <Checkbox
          aria-label={`Select transaction ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => {
            row.toggleSelected(checked === true);
          }}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    id: "select",
    size: 40,
  },
  {
    accessorKey: "pending",
    cell: ({ row }) => {
      const { pending } = row.original;
      const label = pending ? "Pending" : "Posted";
      return (
        <div className={cn(cellRow, "whitespace-nowrap")}>
          <img
            alt={label}
            className="size-5 shrink-0 object-contain"
            decoding="async"
            height={20}
            src={pending ? STATUS_PENDING_ICON : STATUS_POSTED_ICON}
            width={20}
          />
        </div>
      );
    },
    header: "Status",
  },
  {
    accessorFn: (row) => row.institutionName ?? row.accountName ?? "",
    cell: ({ row }) => {
      const { accountName, institutionLogo, institutionName, institutionUrl } =
        row.original;

      return (
        <div className={cellRow} title={institutionName?.trim() || accountName}>
          <InstitutionLogo
            institutionLogo={institutionLogo}
            institutionName={institutionName}
            institutionUrl={institutionUrl}
          />
        </div>
      );
    },
    header: "Bank",
    id: "account",
  },
  {
    accessorFn: (row) => transactionDateSortKey(row),
    cell: ({ row }) => (
      <div className={cn(cellRow, "whitespace-nowrap")}>
        {formatTransactionDateDisplay(row.original)}
      </div>
    ),
    header: "Date",
    id: "date",
  },
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const transactionName = row.original.name;
      const displayName = truncateName(transactionName);
      const { counterparties, logoUrl, merchantName, website } = row.original;

      return (
        <div className="min-w-0 truncate" title={transactionName}>
          <div className={cn(cellRow, "gap-2")}>
            <MerchantLogo
              counterparties={counterparties}
              logoUrl={logoUrl}
              merchantName={merchantName}
              website={website}
            />
            <span>{displayName || "—"}</span>
          </div>
        </div>
      );
    },
    header: "Name",
  },
  {
    accessorFn: (row) => {
      const c = row.personalFinanceCategory;
      if (!c) {
        return "";
      }
      const primary = getCategoryDisplayConfig(c).label;
      const detailed = c.detailed
        ? getDetailedCategoryDisplayName(c.detailed)
        : "";
      return detailed ? `${primary} ${detailed}` : primary;
    },
    cell: ({ row }) => {
      const category = row.original.personalFinanceCategory;
      if (!category) {
        return <div className={cellRow}>—</div>;
      }
      const config = getCategoryDisplayConfig(category);
      const detailed = category.detailed
        ? getDetailedCategoryDisplayName(category.detailed)
        : null;
      const title = detailed ? `${config.label} › ${detailed}` : config.label;

      return (
        <div className="min-w-0" title={title}>
          <div className={cn(cellRow, "min-w-0 gap-2")}>
            <CategoryIcon icon={config.icon} />
            <div className={cn(cellRow, "min-w-0 gap-1.5 text-sm")}>
              <span className="shrink-0 text-foreground">{config.label}</span>
              {detailed ? (
                <>
                  <HugeiconsIcon
                    aria-hidden
                    className="size-3 shrink-0 text-muted-foreground"
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 truncate text-muted-foreground">
                    {detailed}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      );
    },
    header: "Category",
    id: "category",
  },
  {
    accessorKey: "amount",
    cell: ({ row }) => {
      const { amount } = row.original;
      const formattedAmount = currency.format(Math.abs(amount));
      const amountColor =
        amount >= 0 ? "text-red-600 dark:text-red-500" : "text-green-550";
      return (
        <div
          className={cn(cellRow, "whitespace-nowrap tabular-nums", amountColor)}
        >
          {formattedAmount}
        </div>
      );
    },
    header: "Amount",
  },
];

function isInteractiveCellTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest(
      "button, a, input, [role='checkbox'], [data-slot='checkbox'], [data-slot='checkbox-indicator']"
    )
  );
}

export function TransactionsTable({
  isComplete,
  items,
}: {
  isComplete: boolean;
  items: TransactionListItem[];
}) {
  const navigate = useNavigate();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const openTransaction = useCallback(
    (row: Row<TransactionListItem>) => {
      navigate({
        params: { transactionId: row.original.id },
        to: "/transactions/$transactionId",
      });
    },
    [navigate]
  );

  const onRowActivate = useCallback(
    (row: Row<TransactionListItem>, e: MouseEvent | KeyboardEvent) => {
      if ("key" in e) {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }
        e.preventDefault();
      } else if (isInteractiveCellTarget(e.target)) {
        return;
      }
      openTransaction(row);
    },
    [openTransaction]
  );

  const table = useReactTable({
    columns,
    data: items,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ desc: true, id: "date" }],
    },
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  const { rows } = table.getRowModel();
  const monthSections = useMemo(() => groupRowsByMonth(rows), [rows]);

  const hasRows = rows.length > 0;

  return (
    <Table className="h-full min-w-full">
      <TableBody>
        {hasRows &&
          monthSections.map((section) => (
            <Fragment key={section.monthKey}>
              <TableRow className="sticky top-0 z-10 border-0 hover:bg-transparent">
                {columns.map((col, index) => {
                  const colId = getColumnStableId(col);
                  const isFirst = index === 0;
                  const isLast = index === columns.length - 1;
                  const roundedClass = cn(
                    isFirst && "rounded-l-lg",
                    isLast && "rounded-r-lg"
                  );
                  if (colId === "date") {
                    return (
                      <TableCell
                        className={cn(
                          monthDividerBase,
                          "px-3 py-1.5",
                          roundedClass
                        )}
                        key={`${section.monthKey}-date`}
                      >
                        <div className={cn(cellRow, "whitespace-nowrap")}>
                          <span className="truncate font-medium text-foreground text-sm">
                            {section.label}
                          </span>
                        </div>
                      </TableCell>
                    );
                  }
                  if (colId === "pending") {
                    return (
                      <TableCell
                        className={cn(monthDividerBase, "p-3", roundedClass)}
                        key={`${section.monthKey}-pending`}
                      >
                        <div className={cn(cellRow, "whitespace-nowrap")}>
                          <span className="font-normal tabular-nums text-muted-foreground text-sm">
                            {section.rows.length}
                          </span>
                        </div>
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      className={cn(monthDividerBase, "p-3", roundedClass)}
                      key={`${section.monthKey}-${colId}`}
                    />
                  );
                })}
              </TableRow>
              {section.rows.map((row) => (
                <TableRow
                  aria-label={`View details for ${row.original.name}`}
                  className="group cursor-pointer border-0 font-normal hover:bg-transparent data-[state=selected]:bg-transparent"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  key={row.id}
                  tabIndex={0}
                  onClick={(e) => {
                    onRowActivate(row, e);
                  }}
                  onKeyDown={(e) => {
                    onRowActivate(row, e);
                  }}
                >
                  {row.getVisibleCells().map((cell, index, cells) => (
                    <TableCell
                      className={cn(
                        "group-hover:bg-muted group-data-[state=selected]:bg-muted",
                        index === 0 &&
                          "group-hover:rounded-l-lg group-data-[state=selected]:rounded-l-lg",
                        index === cells.length - 1 &&
                          "group-hover:rounded-r-lg group-data-[state=selected]:rounded-r-lg"
                      )}
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        {!hasRows && isComplete && (
          <TableRow className="border-0">
            <TableCell className="p-6" colSpan={columns.length}>
              <div className="text-muted-foreground text-sm">
                No transactions yet.
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
