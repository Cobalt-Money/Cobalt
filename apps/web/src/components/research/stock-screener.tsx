import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { cn } from "@cobalt-web/ui/lib/utils";
import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Link } from "@/components/links";
import { screenerQueryOptions } from "@/components/research/research-queries";
import { sectorHugeiconForValue } from "@/components/research/sector-icons";
import { screenerUniverseQuery } from "@/hooks/research-queries";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
    headerTitle?: string;
  }
}

type ScreenerRow = Record<string, unknown>;

const EMPTY_SCREENER_ROWS: ScreenerRow[] = [];

/** Fixed row height — TickerLogo (28px) + py-1.5 padding (12px). */
const VIRTUAL_ROW_HEIGHT = 44;
const VIRTUAL_OVERSCAN = 8;

/**
 * Fixed column widths so header and body grids compute identical tracks.
 * `auto` sizing would diverge between rows (text-only header vs logo+text body).
 */
const GRID_TEMPLATE_COLUMNS =
  "2.75rem 8rem minmax(8rem, 14rem) repeat(6, minmax(0, 1fr))";

function rawTickerSymbol(row: ScreenerRow): string {
  const s = row.symbol ?? row.ticker;
  return typeof s === "string" ? s.trim() : "";
}

function firstString(row: ScreenerRow, keys: readonly string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
}

function num(row: ScreenerRow, key: string): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) {
    return `${(n / 1e12).toFixed(2)}T`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  return n.toLocaleString();
}

function formatVolume(n: number): string {
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(2)}K`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPrice(n: number): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

function formatPe(n: number): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function NumberCell({
  value,
  format,
}: {
  value: number | null;
  format: (n: number) => string;
}): ReactNode {
  return (
    <span className="tabular-nums">{value === null ? "—" : format(value)}</span>
  );
}

function PinButton({
  symbol,
  starred,
  onToggle,
}: {
  symbol: string;
  starred: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <button
      aria-label={
        starred
          ? `Remove ${symbol} from pinned rows`
          : `Pin ${symbol || "row"} to top`
      }
      aria-pressed={starred}
      className={cn(
        "pointer-events-auto inline-flex shrink-0 rounded-md p-0.5 transition-colors",
        "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
      disabled={!symbol}
      onClick={(e) => {
        e.stopPropagation();
        if (symbol) {
          onToggle();
        }
      }}
      type="button"
    >
      <HugeiconsIcon
        aria-hidden
        className={cn(
          "size-4",
          starred && "text-amber-500 dark:text-amber-400"
        )}
        icon={StarIcon}
        strokeWidth={2}
      />
    </button>
  );
}

function SortIndicator({ dir }: { dir: false | "asc" | "desc" }): ReactNode {
  if (dir === false) {
    return null;
  }
  return (
    <span aria-hidden className="ml-1 text-muted-foreground">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

interface BuildColumnsArgs {
  pinnedSymbols: Set<string>;
  togglePin: (symbol: string) => void;
}

function buildColumns({
  pinnedSymbols,
  togglePin,
}: BuildColumnsArgs): ColumnDef<ScreenerRow>[] {
  return [
    {
      cell: ({ row }) => {
        const symbol = rawTickerSymbol(row.original);
        return (
          <PinButton
            onToggle={() => togglePin(symbol)}
            starred={Boolean(symbol && pinnedSymbols.has(symbol))}
            symbol={symbol}
          />
        );
      },
      enableSorting: false,
      header: () => <span className="sr-only">Pin row to top of the list</span>,
      id: "__watch",
      meta: {
        className: "min-w-[2.75rem] shrink-0 pr-3",
        headerTitle: "Pin row to top of the list",
      },
    },
    {
      accessorFn: (r) => rawTickerSymbol(r),
      cell: ({ row }) => {
        const symbol = rawTickerSymbol(row.original);
        return (
          <div className="flex min-w-0 items-center gap-3.5">
            <TickerLogo size={28} symbol={symbol || "?"} />
            <span className="font-medium tabular-nums">{symbol || "—"}</span>
          </div>
        );
      },
      header: "Symbol",
      id: "symbol",
      meta: { className: "pl-1" },
    },
    {
      accessorFn: (r) => firstString(r, ["companyName", "name"]),
      cell: ({ getValue }) => {
        const text = String(getValue() ?? "");
        const display = text || "—";
        return (
          <span className="block min-w-0 truncate" title={text || undefined}>
            {display}
          </span>
        );
      },
      header: "Name",
      id: "name",
      meta: { className: "min-w-0" },
    },
    {
      accessorFn: (r) => num(r, "price"),
      cell: ({ getValue }) => (
        <NumberCell format={formatPrice} value={getValue() as number | null} />
      ),
      header: "Price",
      id: "price",
      sortUndefined: "last",
    },
    {
      accessorFn: (r) => num(r, "peRatio"),
      cell: ({ getValue }) => (
        <NumberCell format={formatPe} value={getValue() as number | null} />
      ),
      header: "P/E",
      id: "peRatio",
      meta: {
        headerTitle: "Price / earnings (latest reported period in FMP ratios)",
      },
      sortUndefined: "last",
    },
    {
      accessorFn: (r) => num(r, "marketCap"),
      cell: ({ getValue }) => (
        <NumberCell
          format={formatMarketCap}
          value={getValue() as number | null}
        />
      ),
      header: "Market cap",
      id: "marketCap",
      sortUndefined: "last",
    },
    {
      accessorFn: (r) => num(r, "revenue"),
      cell: ({ getValue }) => (
        <NumberCell
          format={formatMarketCap}
          value={getValue() as number | null}
        />
      ),
      header: "Revenue",
      id: "revenue",
      meta: { headerTitle: "Latest reported fiscal year revenue" },
      sortUndefined: "last",
    },
    {
      accessorFn: (r) => num(r, "volume"),
      cell: ({ getValue }) => (
        <NumberCell format={formatVolume} value={getValue() as number | null} />
      ),
      header: "Volume",
      id: "volume",
      sortUndefined: "last",
    },
    {
      accessorFn: (r) => (typeof r.sector === "string" ? r.sector : ""),
      cell: ({ row, getValue }) => {
        const text = String(getValue() ?? "") || "—";
        const Icon = sectorHugeiconForValue(row.original.sector);
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <HugeiconsIcon
              aria-hidden
              className="text-muted-foreground size-4 shrink-0"
              icon={Icon}
              strokeWidth={2}
            />
            <span
              className="block min-w-0 truncate"
              title={text === "—" ? undefined : text}
            >
              {text}
            </span>
          </div>
        );
      },
      header: "Sector",
      id: "sector",
    },
  ];
}

export function StockScreener() {
  const { data, error } = useQuery(screenerUniverseQuery);

  const rows = data?.results ?? EMPTY_SCREENER_ROWS;

  const [pinnedSymbols, setPinnedSymbols] = useState<Set<string>>(
    () => new Set()
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  const togglePin = useCallback((symbol: string) => {
    setPinnedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const columns = useMemo(
    () => buildColumns({ pinnedSymbols, togglePin }),
    [pinnedSymbols, togglePin]
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => rawTickerSymbol(row) || `idx-${index}`,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const sortedRows = table.getRowModel().rows;

  const displayRows = useMemo(() => {
    if (pinnedSymbols.size === 0) {
      return sortedRows;
    }
    const pinned: typeof sortedRows = [];
    const rest: typeof sortedRows = [];
    for (const row of sortedRows) {
      const symbol = rawTickerSymbol(row.original);
      if (symbol && pinnedSymbols.has(symbol)) {
        pinned.push(row);
      } else {
        rest.push(row);
      }
    }
    return [...pinned, ...rest];
  }, [sortedRows, pinnedSymbols]);

  const listRef = useRef<HTMLTableSectionElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    let ancestor: HTMLElement | null = el.parentElement;
    while (ancestor) {
      const style = window.getComputedStyle(ancestor);
      if (/(auto|scroll|overlay)/.test(style.overflowY)) {
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const parent = ancestor ?? document.documentElement;
    setScrollParent(parent);

    const parentRect = parent.getBoundingClientRect();
    const listRect = el.getBoundingClientRect();
    setScrollMargin(listRect.top - parentRect.top + parent.scrollTop);
  }, [rows.length]);

  const virtualizer = useVirtualizer({
    count: displayRows.length,
    estimateSize: () => VIRTUAL_ROW_HEIGHT,
    getScrollElement: () => scrollParent,
    overscan: VIRTUAL_OVERSCAN,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <table className="block w-full text-sm">
          <thead className="block">
            {table.getHeaderGroups().map((hg) => (
              <tr
                className="grid items-center"
                key={hg.id}
                style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
              >
                {hg.headers.map((header) => {
                  const { meta } = header.column.columnDef;
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const onToggle = canSort
                    ? header.column.getToggleSortingHandler()
                    : undefined;
                  return (
                    <th
                      className={cn(
                        "h-10 min-w-0 select-none text-left font-normal text-muted-foreground",
                        canSort && "cursor-pointer",
                        meta?.className
                      )}
                      key={header.id}
                      onClick={onToggle}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onToggle?.(e);
                              }
                            }
                          : undefined
                      }
                      scope="col"
                      tabIndex={canSort ? 0 : -1}
                      title={meta?.headerTitle}
                    >
                      <span className="inline-flex h-full items-center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort ? <SortIndicator dir={sortDir} /> : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            className="block"
            ref={listRef}
            style={{ height: totalSize, position: "relative" }}
          >
            {virtualItems.map((vi) => {
              const row = displayRows[vi.index];
              if (!row) {
                return null;
              }
              const symbol = rawTickerSymbol(row.original);
              return (
                <tr
                  className="absolute inset-x-0 grid hover:bg-muted/50"
                  key={row.id}
                  style={{
                    gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                    height: VIRTUAL_ROW_HEIGHT,
                    transform: `translateY(${vi.start - scrollMargin}px)`,
                  }}
                >
                  {symbol ? (
                    <td className="absolute inset-0 z-0 p-0 [&>a]:block [&>a]:size-full">
                      <Link
                        aria-label={`View ${symbol}`}
                        params={{ symbol }}
                        to="/research/$symbol"
                      />
                    </td>
                  ) : null}
                  {row.getVisibleCells().map((cell) => {
                    const { meta } = cell.column.columnDef;
                    return (
                      <td
                        className={cn(
                          "pointer-events-none relative z-10 flex min-w-0 items-center py-1.5",
                          meta?.className
                        )}
                        key={cell.id}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}

      {data && rows.length === 0 && !error ? (
        <p className="text-muted-foreground text-sm">No rows returned.</p>
      ) : null}
    </div>
  );
}
