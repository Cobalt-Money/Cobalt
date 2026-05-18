import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Add01Icon, BankIcon, Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";

import { TickerLogo } from "../brokerage/ticker-logo";
import { CobaltSelectPopover } from "../select-popover";
import { AccountLogo } from "./account-logo";
import { emptyPosition } from "./positions-card";
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

      <div className="flex items-baseline gap-1.5">
        <input
          aria-label="Shares"
          className="w-40 min-w-0 cursor-text bg-transparent text-foreground text-lg tabular-nums outline-none placeholder:text-muted-foreground/50"
          inputMode="decimal"
          min={0}
          onChange={(e) => onChange({ ...position, shares: e.target.value })}
          placeholder="# of shares"
          step="0.0001"
          type="number"
          value={position.shares}
        />
        {position.shares.trim() === "" ? null : (
          <span className="text-muted-foreground text-sm">shares</span>
        )}
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
      // Price is auto-resolved from the history fetch on (ticker, date). If FMP
      // returned nothing for the window, fall back to 0 so the holding still
      // saves — user can edit later.
      const price = p.pickedPrice ?? p.latestPrice ?? 0;
      return {
        costBasis: null,
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

  const readyPositions = buildReadyPositions(positions);
  const canSubmit = !submitting && accountId !== "" && readyPositions.length > 0;
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({ accountId, positions: readyPositions });
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
          renderIcon={(acc: AddPositionAccountOption) => (
            <AccountLogo
              className="size-5 shrink-0"
              logoDomain={acc.logoDomain}
              name={acc.name}
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
                  name={selectedAccount.name}
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

      <button
        className="inline-flex h-[1.625rem] w-fit shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-foreground/5 px-2 text-muted-foreground text-xs transition-colors hover:bg-foreground/10"
        onClick={() => setPositions((prev) => [...prev, emptyPosition()])}
        type="button"
      >
        <HugeiconsIcon className="size-3.5 shrink-0" icon={Add01Icon} strokeWidth={2} />
        Add position
      </button>

      <div className="mt-2 flex justify-end">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
