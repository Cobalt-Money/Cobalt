import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { cn } from "@cobalt-web/ui/lib/utils";

/** Demo holdings — replace with live data later. */
const DEMO_HOLDINGS = [
  { id: "1", name: "Apple Inc.", pct: 1.24, symbol: "AAPL" },
  { id: "2", name: "Microsoft Corp.", pct: -0.38, symbol: "MSFT" },
  { id: "3", name: "NVIDIA Corp.", pct: 2.91, symbol: "NVDA" },
  { id: "4", name: "Vanguard S&P 500 ETF", pct: 0.52, symbol: "VOO" },
  { id: "5", name: "Tesla Inc.", pct: -1.67, symbol: "TSLA" },
  { id: "6", name: "Amazon.com Inc.", pct: 0.89, symbol: "AMZN" },
] as const;

const formatPct = (pct: number) => {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
};

export function DashboardInvestmentPerformanceCard() {
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

          <ul className="flex flex-col gap-0">
            {DEMO_HOLDINGS.map((row) => {
              const up = row.pct > 0;
              const down = row.pct < 0;
              return (
                <li
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                  key={row.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TickerLogo size={40} symbol={row.symbol} />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-mono text-sm font-semibold tracking-tight">
                        {row.symbol}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {row.name}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-base font-semibold tabular-nums",
                      up && "text-green-700 dark:text-green-400",
                      down && "text-red-700 dark:text-red-400",
                      !up && !down && "text-foreground"
                    )}
                  >
                    {formatPct(row.pct)}
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
