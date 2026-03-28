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

/**
 * Month strip tints follow common **birthstone color associations** (US jewelers’ list:
 * garnet, amethyst, aquamarine, diamond, emerald, pearl, ruby, peridot, sapphire,
 * opal/tourmaline, citrine/topaz, turquoise/tanzanite). Hues are muted opaque oklch.
 * @see https://www.almanac.com/content/birthstones-and-their-meanings
 */
const monthAccents = [
  "bg-[oklch(0.235_0.013_28)]", // Jan — garnet (deep red)
  "bg-[oklch(0.235_0.013_295)]", // Feb — amethyst (violet)
  "bg-[oklch(0.235_0.013_205)]", // Mar — aquamarine (sea blue-green)
  "bg-[oklch(0.235_0.01_265)]", // Apr — diamond (cool icy neutral)
  "bg-[oklch(0.235_0.013_152)]", // May — emerald (green)
  "bg-[oklch(0.235_0.011_305)]", // Jun — pearl (soft lavender-gray)
  "bg-[oklch(0.235_0.013_18)]", // Jul — ruby (red)
  "bg-[oklch(0.235_0.013_128)]", // Aug — peridot (olive yellow-green)
  "bg-[oklch(0.235_0.013_262)]", // Sep — sapphire (royal blue)
  "bg-[oklch(0.235_0.012_335)]", // Oct — tourmaline / opal (often pink)
  "bg-[oklch(0.235_0.014_88)]", // Nov — citrine / topaz (golden amber)
  "bg-[oklch(0.235_0.013_198)]", // Dec — turquoise / tanzanite (teal–blue)
] as const;

function getMonthAccent(monthKey: string): string {
  const month = Number.parseInt(monthKey.split("-")[1] ?? "0", 10);
  return monthAccents[(month - 1) % monthAccents.length] ?? monthAccents[0];
}

const monthDividerBase = "font-medium text-foreground";

const columns: ColumnDef<TransactionListItem>[] = [
  {
    cell: ({ row }) => (
      <div
        className={cn(
          cellRow,
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
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
    accessorKey: "pending",
    cell: ({ row }) => {
      const { pending } = row.original;
      const label = pending ? "Pending" : "Posted";
      return (
        <div className={cn(cellRow, "whitespace-nowrap")}>
          <img
            alt={label}
            className="size-4 shrink-0 object-contain"
            decoding="async"
            height={16}
            src={pending ? STATUS_PENDING_ICON : STATUS_POSTED_ICON}
            width={16}
          />
        </div>
      );
    },
    header: "Status",
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
    <Table className="h-full min-w-full">
      <TableBody>
        {table.getRowModel().rows.length ? (
          monthSections.map((section) => {
            const accent = getMonthAccent(section.monthKey);
            return (
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
                            accent,
                            "px-3 py-2.5",
                            roundedClass
                          )}
                          key={`${section.monthKey}-date`}
                        >
                          <span className="truncate font-medium text-foreground text-sm">
                            {section.label}
                          </span>
                        </TableCell>
                      );
                    }
                    if (colId === "pending") {
                      return (
                        <TableCell
                          className={cn(
                            monthDividerBase,
                            accent,
                            "p-3",
                            roundedClass
                          )}
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
                        className={cn(
                          monthDividerBase,
                          accent,
                          "p-3",
                          roundedClass
                        )}
                        key={`${section.monthKey}-${colId}`}
                      />
                    );
                  })}
                </TableRow>
                {section.rows.map((row) => (
                  <TableRow
                    className="group border-0 font-normal hover:bg-transparent data-[state=selected]:bg-transparent"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
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
            );
          })
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
  );
}
