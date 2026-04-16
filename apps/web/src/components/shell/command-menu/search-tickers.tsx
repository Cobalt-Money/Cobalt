import { env } from "@cobalt-web/env/web";
import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@cobalt-web/ui/components/command";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TickerSearchItem {
  name: string;
  symbol: string;
  type: string;
}

interface TickerWithPrice extends TickerSearchItem {
  price?: number;
}

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

function emptyMessage(rows: TickerSearchItem[], trimmedSearch: string): string {
  if (rows.length === 0) {
    return "Loading tickers…";
  }
  if (trimmedSearch.length > 0) {
    return "No tickers found.";
  }
  return "No tickers.";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches all NASDAQ/NYSE tickers the first time `enabled` becomes true, then
 * fetches prices on-demand for whichever tickers are currently visible.
 */
export function useTickerSearch(trimmedSearch: string, enabled: boolean) {
  const [tickerRows, setTickerRows] = useState<TickerSearchItem[]>([]);
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const fetchedRef = useRef(false);

  // Fetch the full ticker list once on first open
  useEffect(() => {
    if (!enabled || fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    const base = env.VITE_SERVER_URL;

    async function load() {
      try {
        const res = await fetch(`${base}/api/research/search`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as { tickers: TickerSearchItem[] };
          if (data.tickers) {
            setTickerRows(data.tickers);
          }
        }
      } catch {
        // Network or parse errors are silently ignored — ticker search degrades gracefully
      }
    }

    load();
  }, [enabled]);

  const visibleTickers = useMemo<TickerSearchItem[]>(() => {
    if (!enabled || tickerRows.length === 0) {
      return [];
    }
    const q = trimmedSearch.toUpperCase();
    return q
      ? tickerRows
          .filter(
            (t) =>
              t.symbol.toUpperCase().includes(q) ||
              t.name.toUpperCase().includes(q)
          )
          .slice(0, 50)
      : tickerRows.slice(0, 30);
  }, [enabled, tickerRows, trimmedSearch]);

  // Stable comma-separated string — only changes when the visible set actually changes
  const symbolsKey = useMemo(
    () => visibleTickers.map((t) => t.symbol).join(","),
    [visibleTickers]
  );

  useEffect(() => {
    if (!symbolsKey) {
      return;
    }

    const base = env.VITE_SERVER_URL;
    const controller = new AbortController();

    async function fetchPrices() {
      try {
        const res = await fetch(
          `${base}/api/research/batch-quotes?symbols=${encodeURIComponent(symbolsKey)}`,
          { credentials: "include", signal: controller.signal }
        );
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          quotes: { symbol: string; price: number | null }[];
        };
        if (!data.quotes) {
          return;
        }
        setPriceMap((prev) => {
          const next = new Map(prev);
          for (const q of data.quotes) {
            if (q.price !== null) {
              next.set(q.symbol.toUpperCase(), q.price);
            }
          }
          return next;
        });
      } catch {
        // Aborted or network error — silently ignored
      }
    }

    fetchPrices();

    return () => {
      controller.abort();
    };
  }, [symbolsKey]);

  const filteredTickers = useMemo<TickerWithPrice[]>(
    () =>
      visibleTickers.map((t) => ({
        ...t,
        price: priceMap.get(t.symbol.toUpperCase()),
      })),
    [visibleTickers, priceMap]
  );

  return { filteredTickers, tickerRows };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TickerSearchResults({
  filteredTickers,
  tickerRows,
  trimmedSearch,
  onSelect,
}: {
  filteredTickers: TickerWithPrice[];
  tickerRows: TickerSearchItem[];
  trimmedSearch: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <>
      {filteredTickers.length === 0 ? (
        <CommandEmpty>{emptyMessage(tickerRows, trimmedSearch)}</CommandEmpty>
      ) : null}
      <CommandGroup
        heading={trimmedSearch.length > 0 ? "Search results" : "Top tickers"}
      >
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
                <span className="truncate text-muted-foreground text-xs">
                  {t.name}
                </span>
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
