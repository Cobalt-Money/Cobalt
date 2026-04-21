import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo } from "react";

import { ConnectAccountEmpty } from "@/components/empty/connect-account-empty";
import { useBrokerage } from "@/hooks/use-brokerage";

interface PositionRow {
  id: string;
  symbol?: string | null;
  symbolDescription?: string | null;
  units?: number | null;
  averagePurchasePrice?: number | null;
  openPnl?: number | null;
}

const formatPct = (pct: number) => {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
};

export function DashboardInvestmentPerformanceCard() {
  const { positions } = useBrokerage();
  const typedPositions = positions as unknown as PositionRow[];

  const topHoldings = useMemo(
    () =>
      typedPositions
        .map((pos) => {
          const costBasis = (pos.averagePurchasePrice ?? 0) * (pos.units ?? 0);
          const pct =
            costBasis > 0 ? ((pos.openPnl ?? 0) / costBasis) * 100 : 0;
          return { ...pos, pct };
        })
        .toSorted((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, 6),
    [typedPositions]
  );

  return (
    <section
      aria-label="Portfolio holdings performance"
      className="h-full min-w-0 w-full"
    >
      <CobaltCard className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground text-lg font-medium">
            Portfolio performance
          </h2>

          {topHoldings.length === 0 ? (
            <ConnectAccountEmpty
              className="min-h-[220px] border-0"
              description="Link a brokerage to track your holdings and performance."
              title="No holdings yet"
            />
          ) : null}

          <ul className="flex flex-col gap-0">
            {topHoldings.map((row) => {
              const up = row.pct > 0;
              const down = row.pct < 0;
              return (
                <li
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                  key={row.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TickerLogo size={40} symbol={row.symbol ?? ""} />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-semibold tracking-tight">
                        {row.symbol}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {row.symbolDescription ?? row.symbol}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-base font-semibold tabular-nums",
                      up && "text-green-550",
                      down && "text-red-600 dark:text-red-500",
                      !up && !down && "text-foreground"
                    )}
                  >
                    <PrivateAmount length={5}>
                      {formatPct(row.pct)}
                    </PrivateAmount>
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </CobaltCard>
    </section>
  );
}
