import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import { Badge } from "@cobalt-web/ui/components/badge";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@cobalt-web/ui/components/table";
import { cn } from "@cobalt-web/ui/lib/utils";
import { BankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

import { CategoryIcon } from "./category-icon";
import {
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "./horizon-categories";
import { resolveMerchantLogoUrl } from "./merchant-logo";
import {
  formatTransactionAccountDisplayName,
  formatTransactionDateDisplay,
  transactionDateSortKey,
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

const columns: ColumnDef<TransactionListItem>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => {
      const transactionName = row.original.name;
      const logoURL = resolveMerchantLogoUrl(row.original);
      const displayName = truncateName(transactionName);

      return (
        <div className="truncate" title={transactionName}>
          <div className="flex items-end gap-2">
            {logoURL ? (
              <img
                alt=""
                className="size-6 shrink-0 rounded-sm object-contain"
                height={24}
                src={logoURL}
                width={24}
              />
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center">
                <HugeiconsIcon
                  className="text-muted-foreground size-4"
                  icon={BankIcon}
                  strokeWidth={2}
                />
              </div>
            )}
            <span>{displayName || "—"}</span>
          </div>
        </div>
      );
    },
    header: "Name",
  },
  {
    accessorKey: "personalFinanceCategory",
    cell: ({ row }) => {
      const category = row.original.personalFinanceCategory;
      if (!category) {
        return <div>—</div>;
      }
      const config = getCategoryDisplayConfig(category);
      return (
        <div className="flex items-center gap-2">
          <CategoryIcon categoryPrimary={category.primary} icon={config.icon} />
          <span className="leading-none">{config.label}</span>
        </div>
      );
    },
    header: "Category",
    id: "category",
  },
  {
    accessorKey: "personalFinanceCategory",
    cell: ({ row }) => {
      const category = row.original.personalFinanceCategory;
      if (!category?.detailed) {
        return <div>—</div>;
      }
      const detailed = getDetailedCategoryDisplayName(category.detailed);
      return (
        <div className="truncate text-sm" title={detailed}>
          {detailed}
        </div>
      );
    },
    header: "Subcategory",
    id: "detailedCategory",
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
        <div className={cn("whitespace-nowrap tabular-nums", amountColor)}>
          {formattedAmount}
        </div>
      );
    },
    header: () => <span className="block w-full text-right">Amount</span>,
  },
  {
    accessorKey: "accountName",
    cell: ({ row }) => {
      const { accountName } = row.original;
      const { institutionLogo } = row.original;
      const { institutionName } = row.original;
      const displayAccountName =
        formatTransactionAccountDisplayName(accountName);

      return (
        <div className="truncate" title={accountName}>
          <div className="flex items-end gap-2">
            {institutionLogo ? (
              <img
                alt={institutionName ? `${institutionName} logo` : "Bank logo"}
                className="size-6 shrink-0 rounded-sm object-cover"
                height={24}
                src={`data:image/png;base64,${institutionLogo}`}
                width={24}
              />
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center">
                <HugeiconsIcon
                  className="text-muted-foreground size-4"
                  icon={BankIcon}
                  strokeWidth={2}
                />
              </div>
            )}
            <span>{displayAccountName || "—"}</span>
          </div>
        </div>
      );
    },
    header: "Account",
    id: "account",
  },
  {
    accessorKey: "pending",
    cell: ({ row }) => {
      const { pending } = row.original;
      return (
        <div className="whitespace-nowrap">
          <Badge
            className={cn(
              "font-normal",
              pending
                ? "border-orange-700/40 text-orange-700 dark:text-orange-400"
                : "border-green-700/40 text-green-700 dark:text-green-400"
            )}
            variant="outline"
          >
            {pending ? "Pending" : "Posted"}
          </Badge>
        </div>
      );
    },
    header: "Status",
  },
  {
    accessorFn: (row) => transactionDateSortKey(row),
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatTransactionDateDisplay(row.original)}
      </div>
    ),
    header: "Date",
    id: "date",
  },
];

export function TransactionsTable() {
  const table = useReactTable({
    columns,
    data: MOCK_TRANSACTIONS,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ desc: true, id: "date" }],
    },
  });

  return (
    <div className="flex w-full min-w-0 min-h-0 flex-1 flex-col space-y-4">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CobaltToggle size="sm" type="button" variant="outline">
            Amount
          </CobaltToggle>
          <CobaltToggle size="sm" type="button" variant="outline">
            Status
          </CobaltToggle>
          <CobaltToggle size="sm" type="button" variant="outline">
            Account
          </CobaltToggle>
        </div>
        <Button className="shrink-0" size="sm" type="button" variant="outline">
          Export
        </Button>
      </div>

      <Table className="min-w-full">
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow className="border-0 font-normal" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "align-bottom",
                      cell.column.id === "amount" && "text-right"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
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
