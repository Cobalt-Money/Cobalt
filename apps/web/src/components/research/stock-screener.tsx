import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cobalt-web/ui/components/table";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  ArrowDown01Icon,
  ArrowDownDoubleIcon,
  ArrowUp01Icon,
  ArrowUpDoubleIcon,
  PauseIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { Link } from "@/components/links";
import { screenerQueryOptions } from "@/components/research/research-queries";
import { sectorHugeiconForValue } from "@/components/research/sector-icons";

type ScreenerRow = Record<string, unknown>;

const EMPTY_SCREENER_ROWS: ScreenerRow[] = [];

interface ScreenerColumn {
  keys: string[];
  headerTitle?: string;
  label: string;
  /** Narrow/wide hints for `<th>` / `<td>` (e.g. cap long text columns). */
  columnClassName?: string;
}

function formatPct(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return "—";
  }
  return `${Math.abs(v).toFixed(2)}%`;
}

function pickCell(row: ScreenerRow, keys: string[]): string {
  const [k0] = keys;
  if (k0 === "pctChange1d" || k0 === "pctChangeYtd" || k0 === "pctChange1y") {
    return formatPct(row[k0]);
  }
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== "") {
      if (typeof v === "number") {
        return Number.isFinite(v) ? formatNumber(v, key) : String(v);
      }
      return String(v);
    }
  }
  return "—";
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

function formatNumber(n: number, key: string): string {
  const k = key.toLowerCase();
  if (k.includes("market") && k.includes("cap")) {
    return formatMarketCap(n);
  }
  if (k === "volume") {
    return formatVolume(n);
  }
  if (k === "revenue") {
    return formatMarketCap(n);
  }
  if (k === "peRatio") {
    return n.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }
  if (
    k === "price" ||
    k.includes("last") ||
    k === "changespercentage" ||
    k.includes("change")
  ) {
    return n.toLocaleString(undefined, {
      maximumFractionDigits: k.includes("change") ? 2 : 4,
      minimumFractionDigits: 0,
    });
  }
  return n.toLocaleString();
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

function rawTickerSymbol(row: ScreenerRow): string {
  const s = row.symbol ?? row.ticker;
  if (typeof s === "string" && s.trim()) {
    return s.trim();
  }
  return "";
}

/** FMP `grades-consensus` headline → Hugeicons (normalized, case-insensitive). */
function consensusIconForLabel(raw: unknown) {
  if (typeof raw !== "string") {
    return null;
  }
  const s = raw.trim().toLowerCase().replaceAll(/\s+/g, " ");
  if (!s) {
    return null;
  }
  if (s === "strong buy") {
    return ArrowUpDoubleIcon;
  }
  if (s === "buy") {
    return ArrowUp01Icon;
  }
  if (s === "strong sell") {
    return ArrowDownDoubleIcon;
  }
  if (s === "sell") {
    return ArrowDown01Icon;
  }
  if (s === "hold") {
    return PauseIcon;
  }
  return null;
}

/** Same tokens as positive / negative % change columns (1D, YTD, 1Y). */
const PCT_POSITIVE_CLASS = "text-green-550";
const PCT_NEGATIVE_CLASS = "text-red-600 dark:text-red-400";

/** Matches holdings open P&L column tones (`positions-table`). */
function pctChangeToneClass(v: unknown): string {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return "text-muted-foreground";
  }
  if (v > 0) {
    return PCT_POSITIVE_CLASS;
  }
  if (v < 0) {
    return PCT_NEGATIVE_CLASS;
  }
  return "text-muted-foreground";
}

/** Buy / sell use the same green / red as % columns; hold stays muted. */
function consensusToneClass(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const s = raw.trim().toLowerCase().replaceAll(/\s+/g, " ");
  if (s === "strong buy" || s === "buy") {
    return PCT_POSITIVE_CLASS;
  }
  if (s === "strong sell" || s === "sell") {
    return PCT_NEGATIVE_CLASS;
  }
  if (s === "hold") {
    return "text-muted-foreground";
  }
  return null;
}

function sectorCellContent(row: ScreenerRow, col: ScreenerColumn): ReactNode {
  const text = pickCell(row, col.keys);
  const Icon = sectorHugeiconForValue(row.sector);
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
}

function consensusCellContent(row: ScreenerRow): ReactNode {
  const headline =
    typeof row.gradesConsensus === "string" && row.gradesConsensus.trim()
      ? row.gradesConsensus.trim()
      : null;
  const icon = consensusIconForLabel(row.gradesConsensus);
  const tone = consensusToneClass(row.gradesConsensus);
  if (!headline && !icon) {
    return "—";
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {icon ? (
        <HugeiconsIcon
          aria-hidden
          className={cn("size-4 shrink-0", tone ?? "text-muted-foreground")}
          icon={icon}
          strokeWidth={2}
        />
      ) : null}
      {headline ? (
        <span className={cn("font-medium", tone ?? undefined)}>{headline}</span>
      ) : null}
    </div>
  );
}

function screenerCellContent(
  row: ScreenerRow,
  col: ScreenerColumn,
  star?: { pinned: Set<string>; toggle: (symbol: string) => void }
): ReactNode {
  if (col.keys[0] === "__watch") {
    const symbol = rawTickerSymbol(row);
    if (!star) {
      return null;
    }
    const starred = Boolean(symbol && star.pinned.has(symbol));
    return (
      <button
        aria-label={
          starred
            ? `Remove ${symbol} from pinned rows`
            : `Pin ${symbol || "row"} to top`
        }
        aria-pressed={starred}
        className={cn(
          "inline-flex shrink-0 rounded-md p-0.5 transition-colors",
          "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        )}
        disabled={!symbol}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (symbol) {
            star.toggle(symbol);
          }
        }}
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

  if (col.label === "Symbol") {
    return (
      <div className="flex min-w-0 items-center gap-3.5">
        <TickerLogo size={28} symbol={rawTickerSymbol(row) || "?"} />
        <span className="font-medium tabular-nums">
          {pickCell(row, col.keys)}
        </span>
      </div>
    );
  }

  if (col.label === "Name") {
    const text = pickCell(row, col.keys);
    return (
      <span
        className="block min-w-0 truncate"
        title={text === "—" ? undefined : text}
      >
        {text}
      </span>
    );
  }

  const [k0] = col.keys;
  const isPctCol =
    k0 === "pctChange1d" || k0 === "pctChangeYtd" || k0 === "pctChange1y";

  if (isPctCol) {
    return (
      <span
        className={cn(
          "tabular-nums",
          pctChangeToneClass(k0 === undefined ? undefined : row[k0])
        )}
      >
        {pickCell(row, col.keys)}
      </span>
    );
  }

  if (k0 === "volume" || k0 === "revenue" || k0 === "peRatio") {
    return <span className="tabular-nums">{pickCell(row, col.keys)}</span>;
  }

  if (k0 === "gradesConsensus") {
    return consensusCellContent(row);
  }

  if (k0 === "sector") {
    return sectorCellContent(row, col);
  }

  return pickCell(row, col.keys);
}

export function StockScreener() {
  const { data, error } = useQuery(screenerQueryOptions);

  const rows = data?.results ?? EMPTY_SCREENER_ROWS;

  const [pinnedSymbols, setPinnedSymbols] = useState<Set<string>>(
    () => new Set()
  );

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

  const displayRows = useMemo(() => {
    const indexed = rows.map((row, i) => ({ i, row }));
    return indexed
      .toSorted((a, b) => {
        const sa = rawTickerSymbol(a.row);
        const sb = rawTickerSymbol(b.row);
        const pa = Boolean(sa && pinnedSymbols.has(sa));
        const pb = Boolean(sb && pinnedSymbols.has(sb));
        if (pa !== pb) {
          return pa ? -1 : 1;
        }
        return a.i - b.i;
      })
      .map(({ row }) => row);
  }, [rows, pinnedSymbols]);

  const columns: ScreenerColumn[] = [
    {
      columnClassName: "min-w-[2.75rem] shrink-0 pr-3",
      headerTitle: "Pin row to top of the list",
      keys: ["__watch"],
      label: "",
    },
    { columnClassName: "pl-1", keys: ["symbol"], label: "Symbol" },
    {
      columnClassName: "max-w-[11rem] w-[1%] min-w-0 md:max-w-[14rem]",
      keys: ["companyName", "name"],
      label: "Name",
    },
    { keys: ["pctChange1d"], label: "1D" },
    { keys: ["pctChangeYtd"], label: "YTD" },
    { keys: ["pctChange1y"], label: "1Y" },
    { keys: ["price"], label: "Price" },
    {
      headerTitle: "Price / earnings (latest reported period in FMP ratios)",
      keys: ["peRatio"],
      label: "P/E",
    },
    { keys: ["marketCap"], label: "Market cap" },
    {
      headerTitle: "Latest reported fiscal year revenue",
      keys: ["revenue"],
      label: "Revenue",
    },
    {
      headerTitle: "Analyst consensus label from FMP grades-consensus",
      keys: ["gradesConsensus"],
      label: "Consensus",
    },
    { keys: ["volume"], label: "Volume" },
    { keys: ["sector"], label: "Sector" },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <Table className="[&_td]:px-0 [&_th]:px-0">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0">
              {columns.map((col) => (
                <TableHead
                  className={cn("text-muted-foreground", col.columnClassName)}
                  key={col.keys.join("-")}
                  title={col.headerTitle}
                >
                  {col.keys[0] === "__watch" ? (
                    <span className="sr-only">{col.headerTitle}</span>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-0">
            {displayRows.map((row) => {
              const rowKey = [
                pickCell(row, ["symbol", "ticker"]),
                pickCell(row, ["marketCap"]),
                pickCell(row, ["companyName", "name"]),
              ].join("|");
              const symbol = rawTickerSymbol(row);
              return (
                <TableRow
                  className="border-0 hover:bg-muted/50 relative"
                  key={rowKey}
                >
                  {columns.map((col) => (
                    <TableCell
                      className={cn("py-1.5", col.columnClassName)}
                      key={col.keys.join("-")}
                    >
                      {col.keys[0] === "__watch" ? (
                        <>
                          {symbol ? (
                            <span className="absolute inset-0 z-0 [&_a]:block [&_a]:size-full">
                              <Link
                                aria-label={`View ${symbol}`}
                                params={{ symbol }}
                                to="/research/$symbol"
                              />
                            </span>
                          ) : null}
                          <div className="relative z-10">
                            {screenerCellContent(row, col, {
                              pinned: pinnedSymbols,
                              toggle: togglePin,
                            })}
                          </div>
                        </>
                      ) : (
                        screenerCellContent(row, col, {
                          pinned: pinnedSymbols,
                          toggle: togglePin,
                        })
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      {data && rows.length === 0 && !error ? (
        <p className="text-muted-foreground text-sm">No rows returned.</p>
      ) : null}
    </div>
  );
}
