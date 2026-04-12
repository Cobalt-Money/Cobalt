import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format, startOfMonth } from "date-fns";

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);

const DEMO_TRANSACTIONS = [
  {
    amount: -15.99,
    date: "Apr 8",
    id: "1",
    logoUrl: "https://logo.clearbit.com/netflix.com",
    name: "Netflix",
  },
  {
    amount: -47.32,
    date: "Apr 7",
    id: "2",
    logoUrl: "https://logo.clearbit.com/wholefoodsmarket.com",
    name: "Whole Foods Market",
  },
  {
    amount: 4250,
    date: "Apr 5",
    id: "3",
    logoUrl: "https://logo.clearbit.com/gusto.com",
    name: "Acme Payroll",
  },
  {
    amount: -62,
    date: "Apr 4",
    id: "4",
    logoUrl: "https://logo.clearbit.com/shell.com",
    name: "Shell",
  },
];

const DEMO_HOLDINGS = [
  { id: "1", name: "Apple Inc.", pct: 1.24, symbol: "AAPL" },
  { id: "2", name: "Microsoft Corp.", pct: -0.38, symbol: "MSFT" },
  { id: "3", name: "NVIDIA Corp.", pct: 2.91, symbol: "NVDA" },
  { id: "4", name: "Vanguard S&P 500 ETF", pct: 0.52, symbol: "VOO" },
];

const MONTH_START = startOfMonth(new Date());
const MONTHLY_TOTAL = 148;

// Hardcoded subscription billing days for the current month
const SUBSCRIPTION_DAYS = [1, 5, 8, 12, 15, 22, 28].map(
  (day) => new Date(MONTH_START.getFullYear(), MONTH_START.getMonth(), day)
);

function DashboardCalendarCard() {
  return (
    <section
      aria-label="Subscriptions and payments calendar"
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col"
    >
      <CobaltCard className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 w-full flex-1 flex-col p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground mb-5 text-lg font-medium whitespace-nowrap">
            Subscriptions &amp; payments
          </h2>

          <div className="mb-5 flex w-full items-baseline justify-between gap-4">
            <p className="text-foreground shrink-0 text-lg font-semibold tracking-tight">
              {format(MONTH_START, "MMMM yyyy")}
            </p>
            <p className="text-muted-foreground text-right text-base">
              Monthly total:{" "}
              <span className="text-foreground font-semibold tabular-nums">
                ${MONTHLY_TOTAL}
              </span>
            </p>
          </div>

          <Calendar
            className={cn(
              "border-0 bg-transparent p-0 pt-1 shadow-none ring-0",
              "[--cell-size:--spacing(13)]",
              "[--cell-radius:var(--radius-2xl)]",
              "[&_.rdp-month]:gap-2.5",
              "[&_.rdp-weekdays]:gap-1.5",
              "[&_.rdp-week]:gap-1.5",
              "[&_[data-slot=button]]:!rounded-2xl",
              "[&_[data-slot=button]]:border-0 [&_[data-slot=button]]:shadow-none",
              "[&_[data-slot=button]]:bg-muted/80 [&_[data-slot=button]]:hover:bg-muted/95",
              "[&_[data-slot=button][data-selected-single=true]]:!bg-primary",
              "[&_[data-slot=button][data-selected-single=true]]:!text-primary-foreground",
              "[&_[data-slot=button][data-selected-single=true]]:hover:!bg-primary/90",
              "[&_.rdp-weekday]:text-base [&_[data-slot=button]]:text-lg"
            )}
            classNames={{
              day: "relative rounded-2xl border-0 shadow-none",
              month_caption: "hidden",
              nav: "hidden",
            }}
            defaultMonth={MONTH_START}
            modifiers={{ subscription: SUBSCRIPTION_DAYS }}
            modifiersClassNames={{
              subscription:
                "after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-[#ffffff] after:content-['']",
            }}
            mode="single"
            weekStartsOn={1}
          />
        </CardContent>
      </CobaltCard>
    </section>
  );
}

export function BabyDashboard() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 py-2 sm:gap-5 sm:py-3">
        {/* Net worth section */}
        <CobaltCard className="rounded-3xl py-3">
          <CardContent className="p-0 px-5 sm:px-6">
            <p className="text-sm font-medium text-muted-foreground">
              Net Worth
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              $728,510
            </p>
          </CardContent>
        </CobaltCard>

        {/* Main grid */}
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Recent transactions */}
          <section
            aria-label="Recent transactions"
            className="h-full min-w-0 w-full"
          >
            <CobaltCard className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4">
              <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
                <h2 className="text-foreground text-lg font-medium">
                  Recent transactions
                </h2>
                <ul className="flex flex-col gap-0">
                  {DEMO_TRANSACTIONS.map((tx) => {
                    const isInflow = tx.amount > 0;
                    return (
                      <li
                        className="flex min-w-0 items-center justify-between gap-3 py-3"
                        key={tx.id}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                            {tx.logoUrl ? (
                              <img
                                alt={tx.name}
                                className="size-full object-cover"
                                src={tx.logoUrl}
                              />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">
                                {tx.name[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate font-medium">
                              {tx.name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {tx.date}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-base font-semibold tabular-nums",
                            isInflow ? "text-green-550" : "text-foreground"
                          )}
                        >
                          {isInflow ? "+" : ""}
                          {formatUsd(tx.amount)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </CobaltCard>
          </section>

          {/* Subscriptions calendar */}
          <DashboardCalendarCard />

          {/* Portfolio performance */}
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
                  {DEMO_HOLDINGS.map((holding) => {
                    const up = holding.pct > 0;
                    const down = holding.pct < 0;
                    return (
                      <li
                        className="flex min-w-0 items-center justify-between gap-3 py-3"
                        key={holding.id}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <TickerLogo size={40} symbol={holding.symbol} />
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm font-semibold tracking-tight">
                              {holding.symbol}
                            </p>
                            <p className="text-muted-foreground truncate text-sm">
                              {holding.name}
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
                          {up ? "+" : ""}
                          {holding.pct.toFixed(2)}%
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </CobaltCard>
          </section>
        </div>
      </div>
    </div>
  );
}
