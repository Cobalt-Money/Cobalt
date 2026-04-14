"use client";

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
import { useCallback, useMemo, useState } from "react";

import { sectorHugeiconForValue } from "@/components/research/sector-icons";

const MOCK_SCREENER_DATA = [
  {
    consensus: "Strong Buy",
    marketCap: 3_500_000_000_000,
    name: "NVIDIA Corporation",
    pctChange1d: 2.45,
    pctChangeYtd: 42.31,
    peRatio: 65.2,
    price: 142.59,
    sector: "Technology",
    symbol: "NVDA",
    volume: 45_230_000,
  },
  {
    consensus: "Buy",
    marketCap: 3_400_000_000_000,
    name: "Apple Inc.",
    pctChange1d: 1.23,
    pctChangeYtd: 25.67,
    peRatio: 28.5,
    price: 218.92,
    sector: "Technology",
    symbol: "AAPL",
  },
  {
    consensus: "Strong Sell",
    marketCap: 3_300_000_000_000,
    name: "Microsoft Corporation",
    pctChange1d: -0.87,
    pctChangeYtd: 31.42,
    peRatio: 38.9,
    price: 447.31,
    sector: "Technology",
    symbol: "MSFT",
  },
  {
    consensus: "Buy",
    marketCap: 1_900_000_000_000,
    name: "Alphabet Inc.",
    pctChange1d: 0.56,
    pctChangeYtd: 28.91,
    peRatio: 24.3,
    price: 187.45,
    sector: "Technology",
    symbol: "GOOGL",
  },
  {
    consensus: "Hold",
    marketCap: 1_070_000_000_000,
    name: "Tesla Inc.",
    pctChange1d: -0.39,
    pctChangeYtd: 18.23,
    peRatio: 82.4,
    price: 242.84,
    sector: "Consumer Discretionary",
    symbol: "TSLA",
  },
  {
    consensus: "Buy",
    marketCap: 2_100_000_000_000,
    name: "Amazon.com Inc.",
    pctChange1d: 1.89,
    pctChangeYtd: 22.45,
    peRatio: 42.1,
    price: 198.37,
    sector: "Consumer Discretionary",
    symbol: "AMZN",
  },
  {
    consensus: "Sell",
    marketCap: 950_000_000_000,
    name: "Berkshire Hathaway Inc.",
    pctChange1d: 0.23,
    pctChangeYtd: 19.12,
    peRatio: 16.2,
    price: 625.84,
    sector: "Financials",
    symbol: "BRK.B",
  },
  {
    consensus: "Buy",
    marketCap: 680_000_000_000,
    name: "Meta Platforms Inc.",
    pctChange1d: 3.12,
    pctChangeYtd: 35.67,
    peRatio: 31.5,
    price: 512.42,
    sector: "Technology",
    symbol: "META",
  },
  {
    consensus: "Buy",
    marketCap: 650_000_000_000,
    name: "Broadcom Inc.",
    pctChange1d: -1.23,
    pctChangeYtd: 28.34,
    peRatio: 48.7,
    price: 218.91,
    sector: "Technology",
    symbol: "AVGO",
  },
  {
    consensus: "Strong Buy",
    marketCap: 620_000_000_000,
    name: "Eli Lilly and Company",
    pctChange1d: 0.45,
    pctChangeYtd: 45.23,
    peRatio: 52.1,
    price: 876.23,
    sector: "Healthcare",
    symbol: "LLY",
  },
  {
    consensus: "Buy",
    marketCap: 575_000_000_000,
    name: "Visa Inc.",
    pctChange1d: 0.89,
    pctChangeYtd: 12.34,
    peRatio: 38.2,
    price: 287.54,
    sector: "Financials",
    symbol: "V",
  },
  {
    consensus: "Buy",
    marketCap: 545_000_000_000,
    name: "JPMorgan Chase & Co.",
    pctChange1d: 1.34,
    pctChangeYtd: 18.92,
    peRatio: 14.3,
    price: 187.23,
    sector: "Financials",
    symbol: "JPM",
  },
  {
    consensus: "Buy",
    marketCap: 525_000_000_000,
    name: "Mastercard Incorporated",
    pctChange1d: 1.12,
    pctChangeYtd: 14.56,
    peRatio: 42.8,
    price: 521.34,
    sector: "Financials",
    symbol: "MA",
  },
  {
    consensus: "Buy",
    marketCap: 485_000_000_000,
    name: "The Magnificient Seven",
    pctChange1d: 2.34,
    pctChangeYtd: 38.45,
    peRatio: 35.2,
    price: 234.56,
    sector: "Technology",
    symbol: "XLK",
  },
  {
    consensus: "Strong Sell",
    marketCap: 450_000_000_000,
    name: "Johnson & Johnson",
    pctChange1d: -0.56,
    pctChangeYtd: 8.23,
    peRatio: 22.1,
    price: 156.78,
    sector: "Healthcare",
    symbol: "JNJ",
  },
  {
    consensus: "Buy",
    marketCap: 425_000_000_000,
    name: "Synopsys Inc.",
    pctChange1d: 2.67,
    pctChangeYtd: 41.23,
    peRatio: 58.4,
    price: 487.92,
    sector: "Technology",
    symbol: "SNPS",
  },
  {
    consensus: "Strong Buy",
    marketCap: 95_000_000_000,
    name: "Palantir Technologies Inc.",
    pctChange1d: 2.78,
    pctChangeYtd: 62.45,
    peRatio: 185.3,
    price: 84.23,
    sector: "Technology",
    symbol: "PLTR",
  },
  {
    consensus: "Buy",
    marketCap: 390_000_000_000,
    name: "Cadence Design Systems",
    pctChange1d: 3.23,
    pctChangeYtd: 44.56,
    peRatio: 61.7,
    price: 328.45,
    sector: "Technology",
    symbol: "CDNS",
  },
  {
    consensus: "Buy",
    marketCap: 375_000_000_000,
    name: "Advanced Micro Devices",
    pctChange1d: 2.89,
    pctChangeYtd: 36.78,
    peRatio: 55.3,
    price: 187.34,
    sector: "Technology",
    symbol: "AMD",
  },
  {
    consensus: "Buy",
    marketCap: 360_000_000_000,
    name: "ServiceNow Inc.",
    pctChange1d: 1.56,
    pctChangeYtd: 21.45,
    peRatio: 68.9,
    price: 678.92,
    sector: "Technology",
    symbol: "NOW",
  },
  {
    consensus: "Hold",
    marketCap: 345_000_000_000,
    name: "Accenture plc",
    pctChange1d: -0.78,
    pctChangeYtd: 11.23,
    peRatio: 28.5,
    price: 342.56,
    sector: "Technology",
    symbol: "ACN",
  },
  {
    consensus: "Hold",
    marketCap: 330_000_000_000,
    name: "Goldman Sachs Group",
    pctChange1d: 1.23,
    pctChangeYtd: 15.67,
    peRatio: 12.4,
    price: 456.78,
    sector: "Financials",
    symbol: "GS",
  },
  {
    consensus: "Sell",
    marketCap: 315_000_000_000,
    name: "Intel Corporation",
    pctChange1d: -2.34,
    pctChangeYtd: -18.92,
    peRatio: 18.7,
    price: 32.45,
    sector: "Technology",
    symbol: "INTC",
  },
  {
    consensus: "Buy",
    marketCap: 300_000_000_000,
    name: "Salesforce Inc.",
    pctChange1d: 0.67,
    pctChangeYtd: 19.34,
    peRatio: 52.1,
    price: 234.89,
    sector: "Technology",
    symbol: "CRM",
  },
  {
    consensus: "Hold",
    marketCap: 285_000_000_000,
    name: "Cisco Systems Inc.",
    pctChange1d: 0.34,
    pctChangeYtd: 5.67,
    peRatio: 21.3,
    price: 48.92,
    sector: "Technology",
    symbol: "CSCO",
  },
];

function formatMarketCap(n: number): string {
  if (n >= 1e12) {
    return `${(n / 1e12).toFixed(2)}T`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  return n.toLocaleString();
}

function formatPercent(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function pctChangeToneClass(v: number): string {
  if (v > 0) {
    return "text-green-550";
  }
  if (v < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

function consensusIconForLabel(raw: string | undefined) {
  if (!raw) {
    return null;
  }
  const s = raw.trim().toLowerCase().replaceAll(/\s+/g, " ");
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

function consensusToneClass(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const s = raw.trim().toLowerCase().replaceAll(/\s+/g, " ");
  if (s === "strong buy" || s === "buy") {
    return "text-green-550";
  }
  if (s === "strong sell" || s === "sell") {
    return "text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

function ConsensusCell({ consensus }: { consensus?: string }) {
  if (!consensus) {
    return <>—</>;
  }
  const icon = consensusIconForLabel(consensus);
  const tone = consensusToneClass(consensus);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {icon ? (
        <HugeiconsIcon
          aria-hidden
          className={cn("size-4 shrink-0", tone)}
          icon={icon}
          strokeWidth={2}
        />
      ) : null}
      <span className={cn("font-medium", tone)}>{consensus}</span>
    </div>
  );
}

export function BabyResearch() {
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

  const displayRows = useMemo(
    () =>
      MOCK_SCREENER_DATA.toSorted((a, b) => {
        const pa = Boolean(pinnedSymbols.has(a.symbol));
        const pb = Boolean(pinnedSymbols.has(b.symbol));
        if (pa !== pb) {
          return pa ? -1 : 1;
        }
        return MOCK_SCREENER_DATA.indexOf(a) - MOCK_SCREENER_DATA.indexOf(b);
      }),
    [pinnedSymbols]
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Table className="[&_td]:px-0 [&_th]:px-0 text-sm">
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="border-0 align-middle">
            <TableHead className="text-muted-foreground min-w-fit shrink-0 pr-6 py-1.5 align-middle">
              <span className="sr-only">Pin row</span>
            </TableHead>
            <TableHead className="text-muted-foreground px-0 py-1.5 align-middle">
              Symbol
            </TableHead>
            <TableHead className="text-muted-foreground w-48 py-1.5 align-middle pl-0">
              Name
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              Price
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              1D
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              YTD
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              Consensus
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              P/E
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              Market cap
            </TableHead>
            <TableHead className="text-muted-foreground py-1.5 align-middle">
              Sector
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-0">
          {displayRows.map((row) => (
            <TableRow
              className="border-0 cursor-pointer hover:bg-muted/50 align-middle"
              key={row.symbol}
            >
              <TableCell className="py-1.5 min-w-fit shrink-0 align-middle">
                <div className="pr-3">
                  <button
                    aria-label={
                      pinnedSymbols.has(row.symbol)
                        ? `Remove ${row.symbol} from pinned`
                        : `Pin ${row.symbol} to top`
                    }
                    aria-pressed={pinnedSymbols.has(row.symbol)}
                    className={cn(
                      "inline-flex shrink-0 rounded-md p-0.5 transition-colors",
                      "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    )}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(row.symbol);
                    }}
                  >
                    <HugeiconsIcon
                      aria-hidden
                      className={cn(
                        "size-4",
                        pinnedSymbols.has(row.symbol) &&
                          "text-amber-500 dark:text-amber-400"
                      )}
                      icon={StarIcon}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </TableCell>
              <TableCell className="py-1.5 align-middle text-left w-20">
                <div className="flex min-w-0 items-center gap-0.5">
                  <TickerLogo size={16} symbol={row.symbol} />
                  <span className="font-medium tabular-nums">{row.symbol}</span>
                </div>
              </TableCell>
              <TableCell className="py-1.5 w-48 align-middle pl-0 text-left">
                <span className="block min-w-0 truncate" title={row.name}>
                  {row.name}
                </span>
              </TableCell>
              <TableCell className="py-1.5 tabular-nums align-middle text-left pr-6">
                ${row.price.toFixed(2)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1.5 tabular-nums align-middle text-left pr-6",
                  pctChangeToneClass(row.pctChange1d)
                )}
              >
                {formatPercent(row.pctChange1d)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1.5 tabular-nums align-middle text-left pr-6",
                  pctChangeToneClass(row.pctChangeYtd)
                )}
              >
                {formatPercent(row.pctChangeYtd)}
              </TableCell>
              <TableCell className="py-1.5 align-middle text-left text-sm pr-6">
                <ConsensusCell consensus={row.consensus} />
              </TableCell>
              <TableCell className="py-1.5 tabular-nums align-middle text-left pr-6">
                {row.peRatio.toFixed(2)}
              </TableCell>
              <TableCell className="py-1.5 tabular-nums align-middle text-left pr-6">
                {formatMarketCap(row.marketCap)}
              </TableCell>
              <TableCell className="py-1.5 align-middle text-left text-sm">
                {row.sector ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <HugeiconsIcon
                      aria-hidden
                      className="text-muted-foreground size-4 shrink-0"
                      icon={sectorHugeiconForValue(row.sector)}
                      strokeWidth={2}
                    />
                    <span className="block min-w-0 truncate">{row.sector}</span>
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
