import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TickerSuggestionItem {
  symbol: string;
  name: string;
  price?: number | null;
}

export interface TickerSearchState {
  loading: boolean;
  results: readonly TickerSuggestionItem[];
  onQueryChange: (query: string) => void;
}

export interface PriceHistoryPoint {
  date: string;
  close: number;
  low: number;
  high: number;
}

export interface PriceHistoryFetcher {
  fetch: (symbol: string, date: string) => Promise<PriceHistoryPoint[]>;
}

/** One unsaved position in the create-account flow. */
export interface PositionDraft {
  /** Stable client id for React keys. */
  id: string;
  ticker: string;
  name: string | null;
  shares: string;
  dateAcquired: string;
  /** User-entered $ paid total — wins over picker if set. */
  amountPaid: string;
  /** Close price the user picked from the history list. */
  pickedPrice: number | null;
  /** Latest close (most recent point in the history fetch). */
  latestPrice: number | null;
  history: PriceHistoryPoint[];
  historyLoading: boolean;
}

export function emptyPosition(): PositionDraft {
  return {
    amountPaid: "",
    dateAcquired: new Date().toISOString().slice(0, 10),
    history: [],
    historyLoading: false,
    id: crypto.randomUUID(),
    latestPrice: null,
    name: null,
    pickedPrice: null,
    shares: "",
    ticker: "",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const priceFmt = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

function TickerCombobox({
  search,
  value,
  onPick,
}: {
  search: TickerSearchState;
  value: { ticker: string; name: string | null };
  onPick: (item: TickerSuggestionItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value.ticker);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery(value.ticker);
  }, [value.ticker]);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        aria-label="Ticker"
        className="w-full cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1.5 text-foreground text-sm uppercase outline-none focus:border-foreground/30"
        maxLength={32}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          search.onQueryChange(v);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          search.onQueryChange(query);
        }}
        placeholder="AAPL"
        ref={inputRef}
        value={query}
      />
      {open && search.results.length > 0 ? (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-56 w-72 overflow-y-auto rounded-md border border-foreground/10 bg-popover p-1 shadow-md">
          {search.results.slice(0, 12).map((r) => (
            <button
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
              key={r.symbol}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(r);
                setOpen(false);
              }}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-foreground">{r.symbol}</span>
                <span className="ml-2 text-muted-foreground text-xs">{r.name}</span>
              </span>
              {typeof r.price === "number" ? (
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {priceFmt.format(r.price)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PricePicker({
  position,
  onPick,
}: {
  position: PositionDraft;
  onPick: (price: number) => void;
}) {
  if (position.historyLoading) {
    return (
      <div className="rounded-md border border-foreground/10 bg-foreground/[0.03] p-2 text-muted-foreground text-xs">
        Loading prices…
      </div>
    );
  }
  if (position.history.length === 0) {
    return null;
  }
  return (
    <div className="rounded-md border border-foreground/10 bg-foreground/[0.03] p-1">
      <div className="px-2 pt-1 pb-1.5 text-muted-foreground text-xs">
        Closes around {position.dateAcquired} — pick one
      </div>
      <div className="max-h-40 overflow-y-auto">
        {position.history.map((p) => {
          const isPicked = position.pickedPrice === p.close;
          return (
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
                isPicked && "bg-foreground/10",
              )}
              key={p.date}
              onClick={() => onPick(p.close)}
              type="button"
            >
              <span className="text-foreground">{p.date}</span>
              <span className="text-foreground tabular-nums">{priceFmt.format(p.close)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PositionRow({
  position,
  index,
  tickerSearch,
  onChange,
  onRemove,
  removable,
}: {
  position: PositionDraft;
  index: number;
  tickerSearch: TickerSearchState;
  onChange: (next: PositionDraft) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const shares = Number(position.shares);
  const validShares = position.shares.trim() !== "" && Number.isFinite(shares) && shares > 0;
  const amountPaidNum = Number(position.amountPaid);
  const hasAmountPaid = position.amountPaid.trim() !== "" && Number.isFinite(amountPaidNum);
  const derivedCost =
    validShares && position.pickedPrice !== null ? shares * position.pickedPrice : null;
  const displayCost = hasAmountPaid ? amountPaidNum : derivedCost;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 shrink-0 text-muted-foreground text-xs tabular-nums">
          #{index + 1}
        </span>
        <TickerCombobox
          onPick={(item) =>
            onChange({
              ...position,
              latestPrice: item.price ?? null,
              name: item.name,
              ticker: item.symbol,
            })
          }
          search={tickerSearch}
          value={{ name: position.name, ticker: position.ticker }}
        />
        {removable ? (
          <button
            aria-label="Remove position"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
            onClick={onRemove}
            type="button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <span className="shrink-0 text-xs">Shares</span>
          <input
            aria-label="Shares"
            className="w-24 cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground tabular-nums outline-none focus:border-foreground/30"
            inputMode="decimal"
            min={0}
            onChange={(e) => onChange({ ...position, shares: e.target.value })}
            placeholder="0"
            step="0.0001"
            type="number"
            value={position.shares}
          />
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <span className="shrink-0 text-xs">Date</span>
          <input
            aria-label="Date acquired"
            className="cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground text-xs outline-none focus:border-foreground/30"
            onChange={(e) =>
              onChange({
                ...position,
                dateAcquired: e.target.value,
                // Reset picker when date changes — history must refetch.
                history: [],
                pickedPrice: null,
              })
            }
            type="date"
            value={position.dateAcquired}
          />
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <span className="shrink-0 text-xs">Paid (opt)</span>
          <input
            aria-label="Amount paid"
            className="w-28 cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground tabular-nums outline-none focus:border-foreground/30"
            inputMode="decimal"
            min={0}
            onChange={(e) => onChange({ ...position, amountPaid: e.target.value })}
            placeholder="$0.00"
            step="0.01"
            type="number"
            value={position.amountPaid}
          />
        </label>
      </div>

      {hasAmountPaid ? null : (
        <PricePicker
          onPick={(price) => onChange({ ...position, pickedPrice: price })}
          position={position}
        />
      )}

      {displayCost === null ? null : (
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>Cost basis</span>
          <span className="text-foreground tabular-nums">{priceFmt.format(displayCost)}</span>
        </div>
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export interface PositionsCardProps {
  positions: PositionDraft[];
  cashAmount: string;
  tickerSearch: TickerSearchState;
  /** Called when the user picks a ticker + date and history needs fetching. */
  onLoadHistory: (positionId: string) => void;
  onChange: (positions: PositionDraft[]) => void;
  onCashChange: (amount: string) => void;
  onSkip?: () => void;
}

export function PositionsCard({
  positions,
  cashAmount,
  tickerSearch,
  onLoadHistory,
  onChange,
  onCashChange,
  onSkip,
}: PositionsCardProps) {
  const updatePosition = (id: string, next: PositionDraft) => {
    onChange(positions.map((p) => (p.id === id ? next : p)));
  };

  // Fire history fetch when ticker+date set but history not yet loaded.
  useEffect(() => {
    for (const p of positions) {
      if (p.ticker.trim() && p.dateAcquired && !p.historyLoading && p.history.length === 0) {
        onLoadHistory(p.id);
      }
    }
  }, [positions, onLoadHistory]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium text-foreground text-sm">Holdings</h3>
        {onSkip ? (
          <button
            className="text-muted-foreground text-xs underline-offset-2 transition-colors hover:text-foreground hover:underline"
            onClick={onSkip}
            type="button"
          >
            Skip — track total only
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {positions.map((p, i) => (
          <PositionRow
            index={i}
            key={p.id}
            onChange={(next) => updatePosition(p.id, next)}
            onRemove={() => onChange(positions.filter((x) => x.id !== p.id))}
            position={p}
            removable={positions.length > 1}
            tickerSearch={tickerSearch}
          />
        ))}
      </div>

      <Button
        className="self-start"
        onClick={() => onChange([...positions, emptyPosition()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
        Add position
      </Button>

      <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground text-xs">Uninvested cash (optional)</span>
          <div className="flex items-baseline gap-0.5">
            <span
              className={cn(
                "text-sm tabular-nums",
                cashAmount.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
              )}
            >
              $
            </span>
            <input
              aria-label="Uninvested cash"
              className="w-28 cursor-text bg-transparent text-right text-foreground text-sm tabular-nums outline-none placeholder:text-muted-foreground/50"
              inputMode="decimal"
              min={0}
              onChange={(e) => onCashChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={cashAmount}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
