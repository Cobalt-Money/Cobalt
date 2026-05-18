import { Button } from "@cobalt-web/ui/components/button";
import { useEffect, useState } from "react";

import { emptyPosition, PositionsCard } from "./positions-card";
import type { PositionDraft, PriceHistoryPoint, TickerSearchState } from "./positions-card";

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
  /** Pre-select an account (e.g. user opened the form from an account row). */
  initialAccountId?: string;
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

  // If accounts list resolves later (Zero subscription), pick the first one.
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accountId, accounts]);

  // Fire history fetch when a row has ticker + date but no history yet.
  useEffect(() => {
    for (const p of positions) {
      if (p.ticker.trim() && p.dateAcquired && !p.historyLoading && p.history.length === 0) {
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
    }
  }, [positions, onLoadHistory]);

  const parsedCash = cashAmount.trim() === "" ? 0 : Number(cashAmount);
  const validCash = Number.isFinite(parsedCash) && parsedCash >= 0;

  const readyPositions = positions
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

  const canSubmit =
    !submitting && accountId !== "" && validCash && (readyPositions.length > 0 || parsedCash > 0);

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
      className="flex flex-1 flex-col gap-4"
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
      <label className="flex items-center gap-2 text-sm">
        <span className="shrink-0 text-muted-foreground text-xs">Account</span>
        <select
          aria-label="Account"
          className="min-w-0 flex-1 cursor-pointer rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground outline-none focus:border-foreground/30"
          onChange={(e) => setAccountId(e.target.value)}
          value={accountId}
        >
          {accounts.length === 0 ? (
            <option disabled value="">
              No manual investment accounts — create one first
            </option>
          ) : null}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.institutionName ? ` · ${a.institutionName}` : ""}
            </option>
          ))}
        </select>
      </label>

      <PositionsCard
        cashAmount={cashAmount}
        onCashChange={setCashAmount}
        onChange={setPositions}
        onLoadHistory={() => {
          /* fetched by effect above */
        }}
        positions={positions}
        tickerSearch={tickerSearch}
      />

      <div className="mt-auto flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
