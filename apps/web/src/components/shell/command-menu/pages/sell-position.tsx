import type { SellManualHoldingBody } from "@cobalt-web/server-data/brokerage/manual-holdings/schemas";
import { SellPositionForm } from "@cobalt-web/ui/cobalt/accounts/sell-position-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Icon } from "@cobalt-web/ui/components/icon";
import { AppleStocksIcon } from "@hugeicons/core-free-icons";
import { useZero, useQuery as useZeroQuery } from "@rocicorp/zero/react";
import { useQueryClient } from "@tanstack/react-query";
import { mutators, queries } from "@cobalt-web/zero";
import { useCallback, useMemo } from "react";

import { tickerHistoryQuery } from "@/hooks/research-queries";

interface Props {
  /** Fired after a successful submit. Parent decides whether to pop or close. */
  onSuccess: () => void;
  /** Backspace on empty input pops back. */
  onBackspaceWhenEmpty: () => void;
}

export function SellPositionPage({ onSuccess, onBackspaceWhenEmpty }: Props) {
  const zero = useZero();
  const queryClient = useQueryClient();

  const [manualInvestmentAccounts] = useZeroQuery(queries.brokerage.manualInvestmentAccounts());
  /** All manual holdings across the user's manual investment accounts — drives the picker. */
  const [allManualPositions] = useZeroQuery(queries.brokerage.positions({ source: "manual" }));

  const holdings = useMemo(
    () =>
      allManualPositions
        .map((h) => {
          const acct = manualInvestmentAccounts.find((a) => a.id === h.accountId);
          const ticker = h.security?.tickerSymbol ?? null;
          const qty = Number(h.quantity);
          if (!(acct && ticker) || qty <= 0) {
            return null;
          }
          return {
            accountId: acct.id,
            accountName: acct.name ?? "Account",
            holdingId: h.id,
            name: h.security?.name ?? null,
            quantity: qty,
            ticker,
          };
        })
        .filter((h): h is NonNullable<typeof h> => h !== null),
    [allManualPositions, manualInvestmentAccounts],
  );

  const loadTickerHistory = useCallback(
    (ticker: string, date: string) => queryClient.fetchQuery(tickerHistoryQuery(ticker, date)),
    [queryClient],
  );

  const submit = useCallback(
    (values: SellManualHoldingBody) => {
      const holding = holdings.find((h) => h.holdingId === values.holdingId);
      const { server } = zero.mutate(mutators.brokerage.sellManualHolding(values));
      if (holding) {
        cobaltToast.positionSold(holding.ticker, values.sellQuantity);
      }
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(result.error.message || "Couldn't record sale.");
          }
        } catch (error) {
          console.error("Failed to record sale", error);
          cobaltToast.error("Couldn't record sale.");
        }
      })();
    },
    [holdings, zero],
  );

  const handleSubmit = useCallback(
    (values: SellManualHoldingBody) => {
      submit(values);
      onSuccess();
    },
    [onSuccess, submit],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
        <Icon className="shrink-0" icon={AppleStocksIcon} size="lg" />
        Sell Position
      </h2>
      <SellPositionForm
        holdings={holdings}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onLoadHistory={loadTickerHistory}
        onSubmit={handleSubmit}
        submitting={false}
      />
    </div>
  );
}
