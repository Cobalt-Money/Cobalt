import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Add01Icon,
  BankIcon,
  Calendar03Icon,
  Cancel01Icon,
  Coins01Icon,
  Money01Icon,
  SearchDollarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";

import { TickerLogo } from "../brokerage/ticker-logo";
import { CobaltSelectPopover } from "../select-popover";
import { emptyPosition } from "./positions-card";
import type { PositionDraft, PriceHistoryPoint, TickerSearchState } from "./positions-card";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddPositionAccountOption {
  id: string;
  name: string;
  institutionName: string | null;
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
  cashSleeve?: number;
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

// eslint-disable-next-line complexity
function PricePickerPopover({
  position,
  onPick,
}: {
  position: PositionDraft;
  onPick: (price: number) => void;
}) {
  const label =
    position.pickedPrice === null ? "Cost basis" : priceFmt.format(position.pickedPrice);
  const isSet = position.pickedPrice !== null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            className={cn(
              "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
              isSet
                ? "border-foreground/15 bg-input/40 text-foreground"
                : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
            )}
            type="button"
          >
            <HugeiconsIcon className="size-3.5 shrink-0" icon={SearchDollarIcon} strokeWidth={2} />
            {label}
          </button>
        }
      />
      <PopoverContent align="start" className="w-64 p-1">
        {position.historyLoading && (
          <div className="px-2 py-2 text-center text-muted-foreground text-sm">Loading prices…</div>
        )}
        {!position.historyLoading && position.history.length === 0 && (
          <div className="px-2 py-2 text-center text-muted-foreground text-sm">
            Pick a ticker + date to load prices.
          </div>
        )}
        {!position.historyLoading && position.history.length > 0 && (
          <div className="max-h-56 overflow-y-auto">
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
        )}
      </PopoverContent>
    </Popover>
  );
}

// eslint-disable-next-line complexity
function PositionRow({
  position,
  tickerSearch,
  onChange,
  onRemove,
  removable,
}: {
  position: PositionDraft;
  tickerSearch: TickerSearchState;
  onChange: (next: PositionDraft) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const selectedDate = useMemo(
    () => (position.dateAcquired ? isoToDate(position.dateAcquired) : undefined),
    [position.dateAcquired],
  );

  return (
    <div className="flex flex-col gap-2 border-foreground/10 border-b pb-3 last:border-b-0 last:pb-0">
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
        {removable ? (
          <button
            aria-label="Remove position"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
            onClick={onRemove}
            type="button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div className="flex items-baseline gap-0.5">
        <input
          aria-label="Shares"
          className="w-24 min-w-0 cursor-text bg-transparent text-foreground text-lg tabular-nums outline-none placeholder:text-muted-foreground/50"
          inputMode="decimal"
          min={0}
          onChange={(e) => onChange({ ...position, shares: e.target.value })}
          placeholder="0"
          step="0.0001"
          type="number"
          value={position.shares}
        />
        <span className="text-muted-foreground text-sm">shares</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <PricePickerPopover
          onPick={(price) => onChange({ ...position, pickedPrice: price })}
          position={position}
        />
        <div className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-foreground/5 px-2 text-muted-foreground text-xs">
          <HugeiconsIcon className="size-3.5 shrink-0" icon={Money01Icon} strokeWidth={2} />
          <span className="shrink-0">Paid</span>
          <input
            aria-label="Amount paid (overrides picker)"
            className="w-16 min-w-0 cursor-text bg-transparent text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
            inputMode="decimal"
            min={0}
            onChange={(e) => onChange({ ...position, amountPaid: e.target.value })}
            placeholder="—"
            step="0.01"
            type="number"
            value={position.amountPaid}
          />
        </div>
      </div>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function buildReadyPositions(positions: readonly PositionDraft[]) {
  return positions
    .map((p) => {
      const qty = Number(p.shares);
      if (!(p.ticker.trim() && Number.isFinite(qty) && qty > 0)) {
        return null;
      }
      const amount = Number(p.amountPaid);
      const hasAmount = p.amountPaid.trim() !== "" && Number.isFinite(amount) && amount >= 0;
      const price = hasAmount ? amount / qty : (p.pickedPrice ?? p.latestPrice);
      if (price === null || !Number.isFinite(price) || price < 0) {
        return null;
      }
      return {
        costBasis: hasAmount ? amount : null,
        dateAcquired: p.dateAcquired || null,
        institutionPrice: price,
        name: p.name,
        quantity: qty,
        ticker: p.ticker.trim().toUpperCase(),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
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
  const [positions, setPositions] = useState<PositionDraft[]>(() => [emptyPosition()]);
  const [cashAmount, setCashAmount] = useState("");

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accountId, accounts]);

  // Fetch history when a row has ticker + date but no history yet.
  useEffect(() => {
    for (const p of positions) {
      if (!(p.ticker.trim() && p.dateAcquired) || p.historyLoading || p.history.length > 0) {
        continue;
      }
      const targetId = p.id;
      const ticker = p.ticker.trim();
      const date = p.dateAcquired;
      setPositions((prev) =>
        prev.map((x) => (x.id === targetId ? { ...x, historyLoading: true } : x)),
      );
      void (async () => {
        try {
          const { history, latestPrice } = await onLoadHistory(ticker, date);
          setPositions((prev) =>
            prev.map((x) =>
              x.id === targetId
                ? {
                    ...x,
                    history,
                    historyLoading: false,
                    latestPrice: latestPrice ?? x.latestPrice,
                    pickedPrice:
                      x.pickedPrice ??
                      history.find((pt) => pt.date <= date)?.close ??
                      history[0]?.close ??
                      null,
                  }
                : x,
            ),
          );
        } catch {
          setPositions((prev) =>
            prev.map((x) => (x.id === targetId ? { ...x, historyLoading: false } : x)),
          );
        }
      })();
    }
  }, [positions, onLoadHistory]);

  const parsedCash = cashAmount.trim() === "" ? 0 : Number(cashAmount);
  const validCash = Number.isFinite(parsedCash) && parsedCash >= 0;
  const readyPositions = buildReadyPositions(positions);
  const canSubmit =
    !submitting && accountId !== "" && validCash && (readyPositions.length > 0 || parsedCash > 0);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({
      accountId,
      cashSleeve: parsedCash > 0 ? parsedCash : undefined,
      positions: readyPositions,
    });
  };

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (
          e.key === "Backspace" &&
          positions.every((p) => !p.ticker.trim()) &&
          onBackspaceWhenEmpty
        ) {
          onBackspaceWhenEmpty();
        }
      }}
    >
      <div className="flex flex-col gap-3">
        {positions.map((p) => (
          <PositionRow
            key={p.id}
            onChange={(next) => setPositions((prev) => prev.map((x) => (x.id === p.id ? next : x)))}
            onRemove={() => setPositions((prev) => prev.filter((x) => x.id !== p.id))}
            position={p}
            removable={positions.length > 1}
            tickerSearch={tickerSearch}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <CobaltSelectPopover
          emptyText="No manual investment accounts"
          itemKey={(acc: AddPositionAccountOption) => acc.id}
          itemMatch={(acc: AddPositionAccountOption, q) => acc.name.toLowerCase().includes(q)}
          items={accounts}
          onSelect={(acc: AddPositionAccountOption) => setAccountId(acc.id)}
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
              <HugeiconsIcon className="size-3.5 shrink-0" icon={BankIcon} strokeWidth={2} />
              {selectedAccount ? selectedAccount.name : "Account"}
            </button>
          }
        />

        <button
          className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-foreground/5 px-2 text-muted-foreground text-xs transition-colors hover:bg-foreground/10"
          onClick={() => setPositions((prev) => [...prev, emptyPosition()])}
          type="button"
        >
          <HugeiconsIcon className="size-3.5 shrink-0" icon={Add01Icon} strokeWidth={2} />
          Add position
        </button>

        <div
          className={cn(
            "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs",
            cashAmount.trim() !== "" && parsedCash > 0
              ? "border-foreground/15 bg-input/40 text-foreground"
              : "border-foreground/15 bg-foreground/5 text-muted-foreground",
          )}
        >
          <HugeiconsIcon className="size-3.5 shrink-0" icon={Coins01Icon} strokeWidth={2} />
          <span className="shrink-0">Cash</span>
          <input
            aria-label="Uninvested cash"
            className="w-16 min-w-0 cursor-text bg-transparent text-right tabular-nums outline-none placeholder:text-muted-foreground/50"
            inputMode="decimal"
            min={0}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="—"
            step="0.01"
            type="number"
            value={cashAmount}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
