import { AddPositionForm } from "@cobalt-web/ui/cobalt/accounts/add-position-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Icon } from "@cobalt-web/ui/components/icon";
import { AppleStocksIcon } from "@hugeicons/core-free-icons";
import { useZero, useQuery as useZeroQuery } from "@rocicorp/zero/react";
import { useQueryClient } from "@tanstack/react-query";
import { mutators, queries } from "@cobalt-web/zero";
import { useCallback, useMemo, useState } from "react";

import { tickerHistoryQuery } from "@/hooks/research-queries";

import { useTickerSearch } from "../search-tickers";

interface Props {
  /** Fired after a successful submit. Parent decides whether to pop or close. */
  onSuccess: () => void;
  /** Backspace on empty input pops back. */
  onBackspaceWhenEmpty: () => void;
}

export function AddPositionPage({ onSuccess, onBackspaceWhenEmpty }: Props) {
  const zero = useZero();
  const queryClient = useQueryClient();

  const [manualInvestmentAccounts] = useZeroQuery(queries.brokerage.manualInvestmentAccounts());
  const accounts = useMemo(
    () =>
      manualInvestmentAccounts.map((a) => ({
        id: a.id,
        institutionName: a.institutionName ?? null,
        logoDomain: a.logoDomain ?? null,
        name: a.name ?? "Untitled",
        subtype: a.subtype ?? null,
      })),
    [manualInvestmentAccounts],
  );

  // Per-form ticker typeahead.
  const [tickerQuery, setTickerQuery] = useState("");
  const { filteredTickers } = useTickerSearch(tickerQuery, true);
  const tickerSearch = useMemo(
    () => ({
      loading: false,
      onQueryChange: setTickerQuery,
      results: filteredTickers.map((t) => ({
        name: t.name,
        price: t.price,
        symbol: t.symbol,
      })),
    }),
    [filteredTickers],
  );

  // Imperative ticker-history fetch backed by the TanStack Query cache so
  // repeated form opens for the same (ticker, date) don't re-hit FMP.
  const loadTickerHistory = useCallback(
    (ticker: string, date: string) => queryClient.fetchQuery(tickerHistoryQuery(ticker, date)),
    [queryClient],
  );

  const submit = useCallback(
    (values: {
      accountId: string;
      positions: {
        ticker: string;
        name: string | null;
        quantity: number;
        institutionPrice: number;
        costBasis: number | null;
        dateAcquired: string | null;
      }[];
    }) => {
      // Web uses the Zero mutator for optimistic UI; mobile / external clients
      // use the REST endpoint (POST /internal/brokerage/manual-holdings).
      for (const p of values.positions) {
        const { server } = zero.mutate(
          mutators.brokerage.addManualHolding({
            accountId: values.accountId,
            dateAcquired: p.dateAcquired ?? undefined,
            institutionPrice: p.institutionPrice,
            name: p.name ?? undefined,
            quantity: p.quantity,
            ticker: p.ticker,
          }),
        );
        cobaltToast.positionAdded(p.ticker, p.quantity);
        void (async () => {
          try {
            const result = await server;
            if (result.type === "error") {
              cobaltToast.error(result.error.message || `Couldn't save ${p.ticker}.`);
            }
          } catch (error) {
            console.error("Failed to save manual holding", p.ticker, error);
            cobaltToast.error(`Couldn't save ${p.ticker}.`);
          }
        })();
      }
    },
    [zero],
  );

  const handleSubmit = useCallback(
    (values: Parameters<typeof submit>[0]) => {
      submit(values);
      onSuccess();
    },
    [onSuccess, submit],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
        <Icon className="shrink-0" icon={AppleStocksIcon} size="lg" />
        New Position
      </h2>
      <AddPositionForm
        accounts={accounts}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onLoadHistory={loadTickerHistory}
        onSubmit={handleSubmit}
        submitting={false}
        tickerSearch={tickerSearch}
      />
    </div>
  );
}
