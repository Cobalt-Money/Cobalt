import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import { Button } from "@cobalt-web/ui/components/button";
import { Checkbox } from "@cobalt-web/ui/components/checkbox";
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@cobalt-web/ui/components/kibo-ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@cobalt-web/ui/components/table";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, RowSelectionState } from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";

import { CategoryIcon } from "./category-icon";
import {
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "./horizon-categories";
import { InstitutionLogo } from "./institution-logo";
import { MerchantLogo } from "./merchant-logo";
import {
  formatMonthGroupLabel,
  formatTransactionDateDisplay,
  transactionDateSortKey,
  transactionMonthGroupKey,
} from "./transaction-list-helpers";
import { MOCK_TRANSACTIONS } from "./transactions-mock-data";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

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

/** Solid fill only — avoid `backdrop-blur` on sticky rows (very expensive while scrolling). */
const monthDividerCell = "border-border/60 border-b bg-sidebar-inset";

const columns: ColumnDef<TransactionListItem>[] = [
  {
    cell: ({ row }) => (
      <div
        className={cn(
          cellRow,
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          row.getIsSelected() && "opacity-100"
        )}
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
      const { logoUrl, merchantName, website } = row.original;

      return (
        <div className="min-w-0 truncate" title={transactionName}>
          <div className={cn(cellRow, "gap-2")}>
            <MerchantLogo
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
    accessorKey: "amount",
    cell: ({ row }) => {
      const { amount } = row.original;
      const formattedAmount = currency.format(Math.abs(amount));
      const amountColor =
        amount >= 0
          ? "text-red-600 dark:text-red-500"
          : "text-green-600 dark:text-green-500";
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
  {
    accessorKey: "pending",
    cell: ({ row }) => {
      const { pending } = row.original;
      const status = pending ? "degraded" : "online";
      return (
        <div className={cn(cellRow, "whitespace-nowrap")}>
          <Status className="h-auto min-h-5 py-1 font-normal" status={status}>
            <StatusIndicator />
            <StatusLabel>{pending ? "Pending" : "Posted"}</StatusLabel>
          </Status>
        </div>
      );
    },
    header: "Status",
  },
];

export function TransactionsTable() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    columns,
    data: MOCK_TRANSACTIONS,
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

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CobaltToggle size="sm" type="button" variant="outline">
            Amount
          </CobaltToggle>
          <CobaltToggle size="sm" type="button" variant="outline">
            Status
          </CobaltToggle>
          <CobaltToggle size="sm" type="button" variant="outline">
            Bank
          </CobaltToggle>
        </div>
        <Button className="shrink-0" size="sm" type="button" variant="outline">
          Export
        </Button>
      </div>

      <Table className="min-w-full">
        <TableBody>
          {table.getRowModel().rows.length ? (
            monthSections.map((section) => (
              <Fragment key={section.monthKey}>
                <TableRow className="sticky top-0 z-10 border-0 hover:bg-transparent">
                  {columns.map((col) => {
                    const colId = getColumnStableId(col);
                    if (colId === "date") {
                      return (
                        <TableCell
                          className={cn(monthDividerCell, "px-3 py-2.5")}
                          key={`${section.monthKey}-date`}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate font-medium text-foreground text-sm">
                              {section.label}
                            </span>
                            <span className="shrink-0 font-normal tabular-nums text-muted-foreground text-sm">
                              {section.rows.length}
                            </span>
                          </div>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        className={cn(monthDividerCell, "p-3")}
                        key={`${section.monthKey}-${colId}`}
                      />
                    );
                  })}
                </TableRow>
                {section.rows.map((row) => (
                  <TableRow
                    className="group border-0 font-normal"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))
          ) : (
            <TableRow className="border-0">
              <TableCell
                className="h-24 text-center text-muted-foreground"
                colSpan={columns.length}
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
