import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { MouseEvent } from "react";

import { tickerSearchQuery } from "@/hooks/research-queries";
import type { TickerSearchItem } from "@/hooks/research-queries";

export type { TickerSearchItem };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCleanLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
}

const priceFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const formatPrice = (price: number): string => priceFormatter.format(price);

function emptyMessage(
  rows: TickerSearchItem[],
  trimmedSearch: string,
  isLoadingUniverse: boolean,
): string {
  if (isLoadingUniverse && rows.length === 0) {
    return "Loading tickers…";
  }
  if (rows.length === 0) {
    return "No tickers.";
  }
  if (trimmedSearch.length > 0) {
    return "No tickers found.";
  }
  return "No tickers.";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Full cached NASDAQ + NYSE ticker list from `/api/research/search` (DB-backed,
 * includes ETFs + all active tickers). No price data — Cmd-K is navigation only.
 */
export function useTickerSearch(trimmedSearch: string, enabled: boolean) {
  const { data: tickerRows = [], isPending: universePending } = useQuery({
    ...tickerSearchQuery,
    enabled,
  });

  const visibleTickers = useMemo<TickerSearchItem[]>(() => {
    if (!enabled || tickerRows.length === 0) {
      return [];
    }
    const q = trimmedSearch.toUpperCase();
    if (!q) {
      return tickerRows.slice(0, 30);
    }
    const startsWith: TickerSearchItem[] = [];
    const contains: TickerSearchItem[] = [];
    for (const t of tickerRows) {
      const sym = t.symbol.toUpperCase();
      const name = t.name.toUpperCase();
      if (sym.startsWith(q) || name.startsWith(q)) {
        startsWith.push(t);
      } else if (sym.includes(q) || name.includes(q)) {
        contains.push(t);
      }
    }
    return [...startsWith, ...contains].slice(0, 100);
  }, [enabled, tickerRows, trimmedSearch]);

  return {
    filteredTickers: visibleTickers,
    isLoadingUniverse: universePending,
    tickerRows,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TickerSearchResults({
  filteredTickers,
  isLoadingUniverse,
  tickerRows,
  trimmedSearch,
  onSelect,
}: {
  filteredTickers: TickerSearchItem[];
  isLoadingUniverse: boolean;
  tickerRows: TickerSearchItem[];
  trimmedSearch: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <>
      {filteredTickers.length === 0 ? (
        <CommandEmpty>{emptyMessage(tickerRows, trimmedSearch, isLoadingUniverse)}</CommandEmpty>
      ) : null}
      <CommandGroup heading={trimmedSearch.length > 0 ? "Search results" : "Top tickers"}>
        {filteredTickers.map((t) => (
          <CommandItem
            key={t.symbol}
            onSelect={() => onSelect(t.symbol)}
            onMouseDown={(e: MouseEvent) => {
              if (isCleanLeftClick(e)) {
                e.preventDefault();
                onSelect(t.symbol);
              }
            }}
            value={`${t.symbol} ${t.name}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <TickerLogo size={32} symbol={t.symbol} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{t.symbol}</span>
                <span className="truncate text-muted-foreground text-xs">{t.name}</span>
              </div>
              {t.price === undefined ? null : (
                <span className="ml-auto shrink-0 font-medium tabular-nums">
                  {formatPrice(t.price)}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
