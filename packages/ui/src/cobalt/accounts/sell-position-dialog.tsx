import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";

import { TickerLogo } from "../brokerage/ticker-logo";
import type { PriceHistoryPoint } from "./positions-card";
import { RulerPicker } from "./ruler-picker";
import { CobaltSelectPopover } from "../select-popover";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SellableHolding {
  holdingId: string;
  ticker: string;
  /** Display name (security.name); falls back to ticker. */
  name: string | null;
  /** Total shares currently held — submission cannot exceed this. */
  quantity: number;
  /** Account this holding belongs to. */
  accountId: string;
  accountName: string;
}

export interface SellPositionFormValues {
  holdingId: string;
  sellQuantity: number;
  sellPrice: number;
  soldAt: string;
}

export interface SellPositionFormProps {
  holdings: readonly SellableHolding[];
  onSubmit: (values: SellPositionFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
  onBackspaceWhenEmpty?: () => void;
  initialHoldingId?: string;
  /** Optional: fetch historical OHLC around the sale date for the price scrubber. */
  onLoadHistory?: (
    ticker: string,
    date: string,
  ) => Promise<{ history: PriceHistoryPoint[]; latestPrice: number | null }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const priceFmt = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(iso: string): string {
  const d = isoToDate(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ── Form ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line complexity
export function SellPositionForm({
  holdings,
  onSubmit,
  submitting = false,
  submitLabel = "Sell",
  onBackspaceWhenEmpty,
  initialHoldingId,
  onLoadHistory,
}: SellPositionFormProps) {
  const [holdingId, setHoldingId] = useState<string>(
    initialHoldingId ?? holdings[0]?.holdingId ?? "",
  );
  const [sharesText, setSharesText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [soldAt, setSoldAt] = useState<string>(todayIso());
  /** Whether `sharesText` carries a share count or a dollar amount. */
  const [entryMode, setEntryMode] = useState<"shares" | "dollars">("shares");
  const [history, setHistory] = useState<PriceHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  /** Memoize the ticker we last loaded history for, so we don't refetch on every render. */
  const [loadedFor, setLoadedFor] = useState<string>("");

  useEffect(() => {
    if (!holdingId && holdings.length > 0) {
      setHoldingId(holdings[0]?.holdingId ?? "");
    }
  }, [holdingId, holdings]);

  // Fetch OHLC around the sale date for the price scrubber bounds.
  const ticker = holdings.find((h) => h.holdingId === holdingId)?.ticker ?? "";
  const fetchKey = `${ticker}::${soldAt}`;
  useEffect(() => {
    if (!(onLoadHistory && ticker && soldAt) || fetchKey === loadedFor) {
      return;
    }
    setHistoryLoading(true);
    setHistory([]);
    setLoadedFor(fetchKey);
    void (async () => {
      try {
        const { history: hist, latestPrice } = await onLoadHistory(ticker, soldAt);
        setHistory(hist);
        setHistoryLoading(false);
        // Seed the sell price with the closest preceding day's close if blank.
        if (priceText.trim() === "") {
          const bar = hist.findLast((p) => p.date <= soldAt) ?? hist.at(-1) ?? null;
          const seed = bar?.close ?? latestPrice ?? null;
          if (seed !== null) {
            setPriceText(seed.toFixed(2));
          }
        }
      } catch {
        setHistoryLoading(false);
      }
    })();
  }, [fetchKey, loadedFor, onLoadHistory, priceText, soldAt, ticker]);

  const bar = useMemo(() => {
    if (history.length === 0) {
      return null;
    }
    return history.findLast((p) => p.date <= soldAt) ?? history.at(-1) ?? null;
  }, [history, soldAt]);

  const selected = holdings.find((h) => h.holdingId === holdingId) ?? null;
  const maxQty = selected?.quantity ?? 0;
  const parsedPrice = priceText.trim() === "" ? 0 : Number(priceText);
  const validPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0;

  // Derive shares + total proceeds from whichever mode the user typed in.
  const parsedAmount = sharesText.trim() === "" ? 0 : Number(sharesText);
  const finiteAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  let derivedShares: number;
  if (entryMode === "dollars") {
    derivedShares = parsedPrice > 0 ? parsedAmount / parsedPrice : 0;
  } else {
    derivedShares = parsedAmount;
  }
  const proceeds = derivedShares * parsedPrice;
  const maxProceeds = maxQty * parsedPrice;
  const validShares = finiteAmount && derivedShares > 0 && derivedShares <= maxQty;
  const oversell = derivedShares > maxQty && maxQty > 0;

  const canSubmit = !submitting && selected !== null && validShares && validPrice;
  const selectedDate = useMemo(() => isoToDate(soldAt), [soldAt]);

  const handleSubmit = () => {
    if (!(canSubmit && selected)) {
      return;
    }
    onSubmit({
      holdingId: selected.holdingId,
      sellPrice: parsedPrice,
      sellQuantity: derivedShares,
      soldAt,
    });
  };

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === "Backspace" && sharesText === "" && onBackspaceWhenEmpty) {
          onBackspaceWhenEmpty();
        }
      }}
    >
      <div className="flex items-center gap-3">
        {selected ? <TickerLogo className="shrink-0" size={28} symbol={selected.ticker} /> : null}
        <CobaltSelectPopover
          emptyText="No manual holdings to sell"
          itemKey={(h: SellableHolding) => h.holdingId}
          itemMatch={(h, q) =>
            h.ticker.toLowerCase().includes(q) || (h.name ?? "").toLowerCase().includes(q)
          }
          items={holdings}
          onSelect={(h: SellableHolding) => {
            setHoldingId(h.holdingId);
            setSharesText("");
          }}
          renderIcon={(h: SellableHolding) => (
            <TickerLogo className="shrink-0" size={20} symbol={h.ticker} />
          )}
          renderLabel={(h: SellableHolding) => (
            <span className="flex w-full items-center justify-between gap-2">
              <span>
                <span className="font-medium text-foreground">{h.ticker}</span>
                <span className="ml-2 text-muted-foreground text-xs">{h.accountName}</span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </span>
          )}
          searchPlaceholder="Search ticker…"
          selectedKey={holdingId}
          trigger={
            <button
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-transparent px-3 font-semibold text-2xl text-foreground tracking-tight transition-colors hover:bg-foreground/[0.07]"
              type="button"
            >
              {selected ? selected.ticker : "Pick a position"}
            </button>
          }
        />
        <Popover>
          <PopoverTrigger
            render={
              <button
                className="ml-auto flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-foreground transition-colors hover:bg-input/30"
                type="button"
              >
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
                {formatDateLabel(soldAt)}
              </button>
            }
          />
          <PopoverContent align="end" className="w-auto p-2">
            <Calendar
              mode="single"
              onSelect={(d) => {
                if (d) {
                  setSoldAt(dateToIso(d));
                }
              }}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-baseline gap-2">
        {entryMode === "dollars" ? (
          <span className="text-lg text-muted-foreground/50 tabular-nums">$</span>
        ) : null}
        <input
          aria-label={entryMode === "dollars" ? "Dollar amount to sell" : "Shares to sell"}
          className="cursor-text bg-transparent text-foreground text-lg tabular-nums outline-none placeholder:text-muted-foreground/50 [field-sizing:content]"
          inputMode="decimal"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              setSharesText(v);
            }
          }}
          placeholder={entryMode === "dollars" ? "amount" : "# of shares"}
          size={sharesText.trim() === "" ? 12 : Math.max(1, sharesText.length)}
          type="text"
          value={sharesText}
        />
        {sharesText.trim() === "" ? null : (
          <span className="text-muted-foreground text-sm">
            {entryMode === "shares" ? "shares" : null}
            {entryMode === "shares" && parsedPrice > 0 ? " · " : null}
            {entryMode === "dollars" && derivedShares > 0 ? (
              <>
                ≈ {derivedShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares
                ·{" "}
              </>
            ) : null}
            <span className={cn(oversell && "text-destructive")}>
              {maxQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} available
              {entryMode === "dollars" && parsedPrice > 0
                ? ` (${priceFmt.format(maxProceeds)})`
                : null}
            </span>
          </span>
        )}
        <div className="ml-auto flex h-6 shrink-0 rounded-full border border-foreground/15 bg-foreground/[0.03] p-0.5 text-xs">
          {(["shares", "dollars"] as const).map((m) => (
            <button
              className={cn(
                "rounded-full px-2 transition-colors",
                entryMode === m
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={m}
              onClick={() => {
                setEntryMode(m);
                setSharesText("");
              }}
              type="button"
            >
              {m === "shares" ? "Shares" : "Dollars"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-lg tabular-nums",
            priceText.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
          )}
        >
          $
        </span>
        <input
          aria-label="Sell price per share"
          className="cursor-text bg-transparent text-foreground text-lg tabular-nums outline-none placeholder:text-muted-foreground/50 [field-sizing:content]"
          inputMode="decimal"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              setPriceText(v);
            }
          }}
          placeholder="Sell price / share"
          size={priceText.trim() === "" ? 18 : Math.max(1, priceText.length)}
          type="text"
          value={priceText}
        />
      </div>

      {bar && bar.low < bar.high ? (
        <div className="flex flex-col gap-2">
          <RulerPicker
            max={bar.high}
            min={bar.low}
            onValueChange={(v) => setPriceText(v.toFixed(2))}
            step={0.01}
            value={parsedPrice || bar.close}
          />
          <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
            <span>Low {priceFmt.format(bar.low)}</span>
            <span className="text-foreground">
              Price {priceFmt.format(parsedPrice || bar.close)}
            </span>
            <span>High {priceFmt.format(bar.high)}</span>
          </div>
        </div>
      ) : null}
      {historyLoading ? (
        <div className="text-muted-foreground text-xs">Loading price range…</div>
      ) : null}

      {validShares && validPrice ? (
        <div className="text-muted-foreground text-xs">
          Proceeds ·{" "}
          <span className="text-foreground tabular-nums">{priceFmt.format(proceeds)}</span>
        </div>
      ) : null}

      <div className="mt-2 flex justify-end">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Selling…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
