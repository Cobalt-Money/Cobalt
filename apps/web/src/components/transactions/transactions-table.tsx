import { Badge } from "@cobalt-web/ui/components/badge";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cobalt-web/ui/components/table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@cobalt-web/ui/components/toggle-group";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { MOCK_TRANSACTIONS } from "./transactions-mock-data";
import type { TransactionRow } from "./transactions-mock-data";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function sortArrow(sorted: false | "asc" | "desc"): string | null {
  if (sorted === "asc") {
    return " ↑";
  }
  if (sorted === "desc") {
    return " ↓";
  }
  return null;
}

const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorFn: (row) => row.date.getTime(),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt.format(row.original.date)}
      </span>
    ),
    header: "Date",
    id: "date",
  },
  {
    accessorKey: "merchant",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.merchant}</span>
    ),
    header: "Merchant",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "account",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.account}</span>
    ),
    header: "Account",
  },
  {
    accessorFn: (row) => row.amountCents,
    cell: ({ row }) => {
      const cents = row.original.amountCents;
      const outflow = cents < 0;
      return (
        <span
          className={cn(
            "block w-full text-right tabular-nums",
            outflow
              ? "text-foreground"
              : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {currency.format(cents / 100)}
        </span>
      );
    },
    header: () => <span className="block w-full text-right">Amount</span>,
    id: "amount",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <Badge variant={s === "pending" ? "outline" : "secondary"}>
          {s === "pending" ? "Pending" : "Posted"}
        </Badge>
      );
    },
    header: "Status",
  },
];

type FlowFilter = "all" | "inflow" | "outflow";
type StatusFilter = "all" | "pending" | "posted";
type AccountFilter = "all" | "checking" | "credit" | "savings";

function applyTransactionFilters(
  rows: TransactionRow[],
  flow: FlowFilter,
  status: StatusFilter,
  account: AccountFilter
): TransactionRow[] {
  return rows.filter((row) => {
    if (flow === "inflow" && row.amountCents <= 0) {
      return false;
    }
    if (flow === "outflow" && row.amountCents >= 0) {
      return false;
    }
    if (status === "pending" && row.status !== "pending") {
      return false;
    }
    if (status === "posted" && row.status !== "posted") {
      return false;
    }
    if (account === "checking" && !row.account.includes("Checking")) {
      return false;
    }
    if (account === "credit" && !row.account.includes("Credit")) {
      return false;
    }
    if (account === "savings" && !row.account.includes("Savings")) {
      return false;
    }
    return true;
  });
}

export function TransactionsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "date" },
  ]);
  const [flow, setFlow] = useState<FlowFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [account, setAccount] = useState<AccountFilter>("all");

  const filteredRows = useMemo(
    () => applyTransactionFilters(MOCK_TRANSACTIONS, flow, status, account),
    [flow, status, account]
  );

  const table = useReactTable({
    columns,
    data: filteredRows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 8 },
    },
    onSortingChange: setSorting,
    state: { sorting },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [flow, status, account, table]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Amount
            </span>
            <ToggleGroup
              onValueChange={(v) => {
                const next = v.at(-1);
                if (next === "all" || next === "inflow" || next === "outflow") {
                  setFlow(next);
                }
              }}
              size="sm"
              spacing={0}
              value={[flow]}
              variant="outline"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="inflow">Inflows</ToggleGroupItem>
              <ToggleGroupItem value="outflow">Outflows</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Status
            </span>
            <ToggleGroup
              onValueChange={(v) => {
                const next = v.at(-1);
                if (next === "all" || next === "pending" || next === "posted") {
                  setStatus(next);
                }
              }}
              size="sm"
              spacing={0}
              value={[status]}
              variant="outline"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
              <ToggleGroupItem value="posted">Posted</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Account
            </span>
            <ToggleGroup
              onValueChange={(v) => {
                const next = v.at(-1);
                if (
                  next === "all" ||
                  next === "checking" ||
                  next === "credit" ||
                  next === "savings"
                ) {
                  setAccount(next);
                }
              }}
              size="sm"
              spacing={0}
              value={[account]}
              variant="outline"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="checking">Checking</ToggleGroupItem>
              <ToggleGroupItem value="credit">Credit</ToggleGroupItem>
              <ToggleGroupItem value="savings">Savings</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <Button className="shrink-0" size="sm" type="button" variant="outline">
          Export
        </Button>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    header.column.id === "amount" && "text-right",
                    header.column.getCanSort() &&
                      "cursor-pointer select-none hover:bg-muted/60"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {sortArrow(header.column.getIsSorted())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(cell.column.id === "amount" && "text-right")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
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

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length === 0
            ? "0 rows"
            : `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–${Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <Button
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  );
}
