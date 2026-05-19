import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { BankIcon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";

import { TickerLogo } from "../brokerage/ticker-logo";
import { CobaltSelectPopover } from "../select-popover";
import { AccountLogo } from "./account-logo";
import { emptyPosition } from "./positions-card";
import { RulerPicker } from "./ruler-picker";
import type { PositionDraft, PriceHistoryPoint, TickerSearchState } from "./positions-card";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddPositionAccountOption {
  id: string;
  name: string;
  institutionName: string | null;
  logoDomain: string | null;
  subtype: string | null;
}

export interface AddPositionFormValues {
  accountId: string;
  positions: {
    ticker: string;
    name: string | null;
    quantity: number;
    institutionPrice: number;
    costBasis: number | null;
    dateAcquired: string | null;
  }[];
}

export interface AddPositionFormProps {
  accounts: readonly AddPositionAccountOption[];
  tickerSearch: TickerSearchState;
  onLoadHistory: (
    ticker: string,
    date: string,
  ) => Promise<{ history: PriceHistoryPoint[]; latestPrice: number | null }>;
  onSubmit: (values: AddPositionFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
  onBackspaceWhenEmpty?: () => void;
  initialAccountId?: string;
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
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Position row pieces ───────────────────────────────────────────────────────

function TickerCombobox({
  search,
  value,
  onPick,
  onClear,
}: {
  search: TickerSearchState;
  value: string;
  onPick: (item: { symbol: string; name: string; price?: number | null }) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-2">
      {value.trim() ? <TickerLogo className="shrink-0" size={28} symbol={value} /> : null}
      <input
        aria-label="Ticker"
        className="w-full min-w-0 cursor-text bg-transparent font-medium text-2xl text-foreground uppercase leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
        maxLength={32}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (v === "") {
            onClear();
          }
          search.onQueryChange(v);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          search.onQueryChange(query);
        }}
        placeholder="AAPL"
        value={query}
      />
      {open && search.results.length > 0 ? (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-56 w-72 overflow-y-auto rounded-md border border-foreground/10 bg-popover p-1 shadow-md">
          {search.results.slice(0, 12).map((r) => (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
              key={r.symbol}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(r);
                setOpen(false);
              }}
              type="button"
            >
              <TickerLogo size={20} symbol={r.symbol} />
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

function PriceRangeSlider({
  position,
  onPick,
}: {
  position: PositionDraft;
  onPick: (price: number) => void;
}) {
  const bar = useMemo(() => {
    if (!position.dateAcquired || position.history.length === 0) {
      return null;
    }
    return (
      // history is sorted oldest-first; findLast = closest trading day on or
      // before the acquisition date. Plain find would pick the OLDEST in the
      // window, which is the wrong bar.
      position.history.findLast((p) => p.date <= position.dateAcquired) ??
      position.history.at(-1) ??
      null
    );
  }, [position.dateAcquired, position.history]);

  if (!bar || bar.low >= bar.high) {
    return null;
  }
  const current = position.pickedPrice ?? bar.close;
  return (
    <div className="flex flex-col gap-2">
      <RulerPicker
        max={bar.high}
        min={bar.low}
        onValueChange={onPick}
        step={0.01}
        value={current}
      />
      <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
        <span>Low {priceFmt.format(bar.low)}</span>
        <span className="text-foreground">Price {priceFmt.format(current)}</span>
        <span>High {priceFmt.format(bar.high)}</span>
      </div>
    </div>
  );
}

function PositionRow({
  position,
  tickerSearch,
  onChange,
}: {
  position: PositionDraft;
  tickerSearch: TickerSearchState;
  onChange: (next: PositionDraft) => void;
}) {
  const selectedDate = useMemo(
    () => (position.dateAcquired ? isoToDate(position.dateAcquired) : undefined),
    [position.dateAcquired],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <TickerCombobox
          onClear={() => onChange({ ...position, latestPrice: null, name: null, ticker: "" })}
          onPick={(item) =>
            onChange({
              ...position,
              latestPrice: item.price ?? null,
              name: item.name,
              ticker: item.symbol,
            })
          }
          search={tickerSearch}
          value={position.ticker}
        />
        <Popover>
          <PopoverTrigger
            render={
              <button
                className="-mx-1 flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-base text-foreground transition-colors hover:bg-input/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                type="button"
              >
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
                {formatDateLabel(position.dateAcquired || todayIso())}
              </button>
            }
          />
          <PopoverContent align="end" className="w-auto p-2">
            <Calendar
              mode="single"
              onSelect={(d) => {
                if (d) {
                  onChange({
                    ...position,
                    dateAcquired: dateToIso(d),
                    history: [],
                    pickedPrice: null,
                  });
                }
              }}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-baseline gap-2">
        {position.entryMode === "dollars" ? (
          <span className="text-lg text-muted-foreground/50 tabular-nums">$</span>
        ) : null}
        <input
          aria-label={position.entryMode === "dollars" ? "Dollar amount" : "Shares"}
          className="cursor-text bg-transparent text-foreground text-lg tabular-nums outline-none placeholder:text-muted-foreground/50 [field-sizing:content]"
          inputMode="decimal"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              onChange({ ...position, shares: v });
            }
          }}
          placeholder={position.entryMode === "dollars" ? "amount" : "# of shares"}
          size={position.shares.trim() === "" ? 12 : Math.max(1, position.shares.length)}
          type="text"
          value={position.shares}
        />
        {position.shares.trim() === "" || position.entryMode === "dollars" ? null : (
          <span className="text-muted-foreground text-sm">shares</span>
        )}
        <div className="ml-auto flex h-6 shrink-0 rounded-full border border-foreground/15 bg-foreground/[0.03] p-0.5 text-xs">
          {(["shares", "dollars"] as const).map((m) => (
            <button
              className={cn(
                "rounded-full px-2 transition-colors",
                position.entryMode === m
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={m}
              onClick={() => onChange({ ...position, entryMode: m, shares: "" })}
              type="button"
            >
              {m === "shares" ? "Shares" : "Dollars"}
            </button>
          ))}
        </div>
      </div>

      <PriceRangeSlider
        onPick={(price) => onChange({ ...position, pickedPrice: price })}
        position={position}
      />
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function buildReadyPosition(p: PositionDraft) {
  if (!p.ticker.trim()) {
    return null;
  }
  // Price is auto-resolved from the history fetch on (ticker, date). If FMP
  // returned nothing for the window, fall back to 0 so the holding still
  // saves — user can edit later.
  const price = p.pickedPrice ?? p.latestPrice ?? 0;
  const typed = Number(p.shares);
  if (!(Number.isFinite(typed) && typed > 0)) {
    return null;
  }
  // Dollar-mode: derive shares from typed $ / price. Requires a valid price.
  let qty: number;
  if (p.entryMode === "dollars") {
    qty = price > 0 ? typed / price : 0;
  } else {
    qty = typed;
  }
  if (qty <= 0) {
    return null;
  }
  return {
    costBasis: null as number | null,
    dateAcquired: p.dateAcquired || null,
    institutionPrice: price,
    name: p.name,
    quantity: qty,
    ticker: p.ticker.trim().toUpperCase(),
  };
}

// eslint-disable-next-line complexity
export function AddPositionForm({
  accounts,
  tickerSearch,
  onLoadHistory,
  onSubmit,
  submitting = false,
  submitLabel = "Add",
  onBackspaceWhenEmpty,
  initialAccountId,
}: AddPositionFormProps) {
  const [accountId, setAccountId] = useState<string>(initialAccountId ?? accounts[0]?.id ?? "");
  const [position, setPosition] = useState<PositionDraft>(() => emptyPosition());

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accountId, accounts]);

  // Fetch history when ticker + date are set but history hasn't loaded.
  useEffect(() => {
    if (
      !(position.ticker.trim() && position.dateAcquired) ||
      position.historyLoading ||
      position.history.length > 0
    ) {
      return;
    }
    const ticker = position.ticker.trim();
    const date = position.dateAcquired;
    setPosition((prev) => ({ ...prev, historyLoading: true }));
    void (async () => {
      try {
        const { history, latestPrice } = await onLoadHistory(ticker, date);
        setPosition((prev) => ({
          ...prev,
          history,
          historyLoading: false,
          latestPrice: latestPrice ?? prev.latestPrice,
          pickedPrice:
            prev.pickedPrice ??
            history.findLast((pt) => pt.date <= date)?.close ??
            history.at(-1)?.close ??
            null,
        }));
      } catch {
        setPosition((prev) => ({ ...prev, historyLoading: false }));
      }
    })();
  }, [position, onLoadHistory]);

  const ready = buildReadyPosition(position);
  const canSubmit = !submitting && accountId !== "" && ready !== null;
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = () => {
    if (!(canSubmit && ready)) {
      return;
    }
    onSubmit({ accountId, positions: [ready] });
  };

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !position.ticker.trim() && onBackspaceWhenEmpty) {
          onBackspaceWhenEmpty();
        }
      }}
    >
      <PositionRow onChange={setPosition} position={position} tickerSearch={tickerSearch} />

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <CobaltSelectPopover
          emptyText="No manual investment accounts"
          itemKey={(acc: AddPositionAccountOption) => acc.id}
          itemMatch={(acc: AddPositionAccountOption, q) => acc.name.toLowerCase().includes(q)}
          items={accounts}
          onSelect={(acc: AddPositionAccountOption) => setAccountId(acc.id)}
          renderIcon={(acc: AddPositionAccountOption) => (
            <AccountLogo
              className="size-5 shrink-0"
              logoDomain={acc.logoDomain}
              name={acc.institutionName ?? acc.name}
              source="manual"
              subtype={acc.subtype ?? "investment"}
            />
          )}
          renderLabel={(acc: AddPositionAccountOption) =>
            acc.institutionName ? `${acc.name} · ${acc.institutionName}` : acc.name
          }
          searchPlaceholder="Search accounts…"
          selectedKey={accountId}
          trigger={
            <button
              className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-input/40 px-2 text-foreground text-xs transition-colors"
              type="button"
            >
              {selectedAccount ? (
                <AccountLogo
                  className="size-4 shrink-0"
                  logoDomain={selectedAccount.logoDomain}
                  name={selectedAccount.institutionName ?? selectedAccount.name}
                  source="manual"
                  subtype={selectedAccount.subtype ?? "investment"}
                />
              ) : (
                <HugeiconsIcon className="size-3.5 shrink-0" icon={BankIcon} strokeWidth={2} />
              )}
              {selectedAccount ? selectedAccount.name : "Account"}
            </button>
          }
        />
      </div>

      <div className="mt-2 flex justify-end">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
