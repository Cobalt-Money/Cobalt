"use client";

import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, startOfMonth } from "date-fns";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { AllocationDonutChart } from "@/components/dashboard/net-worth-donut-chart";

const formatUsdInteger = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const TIME_RANGES = ["1W", "1M", "1Y", "All"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CATEGORY_COLORS = {
  checking: "#3b82f6",
  credit: "#ec4899",
  investments: "#38bdf8",
  loans: "#f97316",
  savings: "#6366f1",
} as const;

const NET_WORTH_TOTAL = 728_510;

const DEMO_CHART_DATA = [
  { fullLabel: "May 2024", label: "May", value: 612_000 },
  { fullLabel: "Jun 2024", label: "Jun", value: 628_000 },
  { fullLabel: "Jul 2024", label: "Jul", value: 641_000 },
  { fullLabel: "Aug 2024", label: "Aug", value: 655_000 },
  { fullLabel: "Sep 2024", label: "Sep", value: 649_000 },
  { fullLabel: "Oct 2024", label: "Oct", value: 668_000 },
  { fullLabel: "Nov 2024", label: "Nov", value: 682_000 },
  { fullLabel: "Dec 2024", label: "Dec", value: 695_000 },
  { fullLabel: "Jan 2025", label: "Jan", value: 702_000 },
  { fullLabel: "Feb 2025", label: "Feb", value: 710_000 },
  { fullLabel: "Mar 2025", label: "Mar", value: 718_000 },
  { fullLabel: "Apr 2025", label: "Apr", value: NET_WORTH_TOTAL },
];

const DEMO_CATEGORIES = [
  {
    color: CATEGORY_COLORS.investments,
    key: "investments",
    label: "Investments",
    pct: 62,
    value: 451_676,
  },
  {
    color: CATEGORY_COLORS.savings,
    key: "savings",
    label: "Savings",
    pct: 18,
    value: 131_132,
  },
  {
    color: CATEGORY_COLORS.checking,
    key: "checking",
    label: "Checking",
    pct: 12,
    value: 87_421,
  },
  {
    color: CATEGORY_COLORS.credit,
    key: "credit",
    label: "Credit",
    pct: 5,
    value: 36_425,
  },
  {
    color: CATEGORY_COLORS.loans,
    key: "loans",
    label: "Loans",
    pct: 3,
    value: 21_855,
  },
];

const DEMO_DONUT_CONFIG: ChartConfig = {
  checking: { color: CATEGORY_COLORS.checking, label: "Checking" },
  credit: { color: CATEGORY_COLORS.credit, label: "Credit" },
  investments: { color: CATEGORY_COLORS.investments, label: "Investments" },
  loans: { color: CATEGORY_COLORS.loans, label: "Loans" },
  savings: { color: CATEGORY_COLORS.savings, label: "Savings" },
};

const DEMO_DONUT_DATA = DEMO_CATEGORIES.map((c) => ({
  name: c.key,
  value: c.pct,
}));

const Y_DOMAIN: [number, number] = [580_000, 750_000];

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);

const DEMO_TRANSACTIONS = [
  {
    amount: -11.99,
    date: "Apr 8",
    id: "1",
    logoUrl: "https://plaid-merchant-logos.plaid.com/spotify_947.png",
    name: "Spotify",
    website: "spotify.com",
  },
  {
    amount: -6.45,
    date: "Apr 7",
    id: "2",
    logoUrl: "https://plaid-merchant-logos.plaid.com/starbucks_956.png",
    name: "Starbucks",
    website: "starbucks.com",
  },
  {
    amount: -23.1,
    date: "Apr 5",
    id: "3",
    logoUrl: "https://plaid-merchant-logos.plaid.com/uber_1060.png",
    name: "Uber",
    website: "uber.com",
  },
  {
    amount: -62,
    date: "Apr 4",
    id: "4",
    logoUrl: "https://plaid-merchant-logos.plaid.com/shell_891.png",
    name: "Shell",
    website: "shell.com",
  },
  {
    amount: -84.37,
    date: "Apr 4",
    id: "5",
    logoUrl: "https://plaid-merchant-logos.plaid.com/trader_joes_1041.png",
    name: "Trader Joe's",
    website: "traderjoes.com",
  },
  {
    amount: -12.49,
    date: "Apr 3",
    id: "6",
    logoUrl: "https://plaid-merchant-logos.plaid.com/mcdonalds_619.png",
    name: "McDonald's",
    website: "mcdonalds.com",
  },
  {
    amount: -156.22,
    date: "Apr 2",
    id: "7",
    logoUrl: "https://plaid-merchant-logos.plaid.com/target_997.png",
    name: "Target",
    website: "target.com",
  },
  {
    amount: -18.75,
    date: "Apr 2",
    id: "8",
    logoUrl: "https://plaid-merchant-logos.plaid.com/lyft_597.png",
    name: "Lyft",
    website: "lyft.com",
  },
  {
    amount: -9.99,
    date: "Apr 1",
    id: "9",
    logoUrl: "https://plaid-merchant-logos.plaid.com/apple_63.png",
    name: "Apple",
    website: "apple.com",
  },
  {
    amount: -73.14,
    date: "Mar 31",
    id: "10",
    logoUrl: "https://plaid-merchant-logos.plaid.com/walmart_1100.png",
    name: "Walmart",
    website: "walmart.com",
  },
];

const DEMO_HOLDINGS = [
  { id: "1", name: "Apple Inc.", pct: 1.24, symbol: "AAPL" },
  { id: "2", name: "Microsoft Corp.", pct: -0.38, symbol: "MSFT" },
  { id: "3", name: "NVIDIA Corp.", pct: 2.91, symbol: "NVDA" },
  { id: "4", name: "Vanguard S&P 500 ETF", pct: 0.52, symbol: "VOO" },
  { id: "5", name: "Amazon.com Inc.", pct: 0.88, symbol: "AMZN" },
  { id: "6", name: "Alphabet Inc.", pct: -0.15, symbol: "GOOGL" },
  { id: "7", name: "Tesla, Inc.", pct: -1.42, symbol: "TSLA" },
  { id: "8", name: "Meta Platforms, Inc.", pct: 1.67, symbol: "META" },
  { id: "9", name: "Invesco QQQ Trust", pct: 0.73, symbol: "QQQ" },
  { id: "10", name: "Costco Wholesale", pct: 0.34, symbol: "COST" },
];

const MONTH_START = startOfMonth(new Date());
const MONTHLY_TOTAL = 148;

// Hardcoded subscription billing days for the current month
const SUBSCRIPTION_DAYS = [1, 5, 8, 12, 15, 22, 28].map(
  (day) => new Date(MONTH_START.getFullYear(), MONTH_START.getMonth(), day),
);

function DashboardCalendarCard() {
  return (
    <section
      aria-label="Subscriptions and payments calendar"
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col"
    >
      <Card
        variant="subtle"
        className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-3xl py-4"
      >
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
              <span className="text-foreground font-semibold tabular-nums">${MONTHLY_TOTAL}</span>
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
              "[&_.rdp-weekday]:text-base [&_[data-slot=button]]:text-lg",
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
      </Card>
    </section>
  );
}

export function BabyDashboard() {
  const [range, setRange] = useState<TimeRange>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [categoryHover, setCategoryHover] = useState<number | null>(null);

  const headlineValue =
    hoverIndex === null ? NET_WORTH_TOTAL : (DEMO_CHART_DATA[hoverIndex]?.value ?? NET_WORTH_TOTAL);

  const categoryCenterValue =
    categoryHover === null
      ? undefined
      : formatUsdInteger(DEMO_CATEGORIES[categoryHover]?.value ?? 0);

  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-2 sm:gap-5 sm:py-3 2xl:max-w-7xl">
        {/* Net worth section */}
        <section aria-label="Net worth overview" className="w-full min-w-0">
          <Card variant="subtle" className="overflow-hidden rounded-3xl py-3">
            <CardContent className="p-0">
              <div className="flex flex-col lg:min-h-[300px] lg:flex-row lg:items-stretch">
                {/* Net worth history chart */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-5 sm:gap-5 sm:px-6">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 text-left">
                      <p className="text-foreground text-left text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                        {formatUsdInteger(headlineValue)}
                      </p>
                    </div>
                    <Button
                      className="max-w-[min(15rem,calc(100vw-2.5rem))] justify-between gap-2 font-normal"
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <span className="truncate">All accounts</span>
                      <HugeiconsIcon
                        className="text-muted-foreground shrink-0"
                        icon={ArrowDown01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                    </Button>
                  </div>

                  <div
                    aria-label="Chart time range"
                    className="flex flex-wrap gap-1"
                    role="toolbar"
                  >
                    {TIME_RANGES.map((t) => {
                      const selected = range === t;
                      return (
                        <Button
                          aria-pressed={selected}
                          className="h-6 shrink-0 rounded-full px-2 text-[10px] font-medium"
                          key={t}
                          onClick={() => setRange(t)}
                          size="sm"
                          type="button"
                          variant={selected ? "outline" : "ghost"}
                        >
                          {t}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="text-muted-foreground min-h-[150px] w-full min-w-0 flex-1 sm:min-h-[160px] [&_.recharts-cartesian-axis-tick-value]:tabular-nums">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart
                        barCategoryGap="12%"
                        data={DEMO_CHART_DATA}
                        margin={{ bottom: 4, left: 4, right: 8, top: 8 }}
                      >
                        <XAxis
                          axisLine={false}
                          dataKey="label"
                          interval={0}
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                          tickLine={false}
                        />
                        <YAxis domain={Y_DOMAIN} hide />
                        <Bar
                          dataKey="value"
                          isAnimationActive={false}
                          maxBarSize={40}
                          onMouseEnter={(_, index) => setHoverIndex(index)}
                          onMouseLeave={() => setHoverIndex(null)}
                          radius={[12, 12, 12, 12]}
                        >
                          {DEMO_CHART_DATA.map((row, i) => (
                            <Cell
                              fill="var(--color-green-550)"
                              fillOpacity={hoverIndex !== null && i !== hoverIndex ? 0.2 : 1}
                              key={row.fullLabel}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories donut */}
                <div
                  className={cn(
                    "border-border/60 flex w-full shrink-0 flex-col gap-4 border-t px-5 sm:px-6",
                    "lg:w-[min(100%,20rem)] lg:border-t-0 lg:border-l",
                  )}
                  onMouseLeave={() => setCategoryHover(null)}
                >
                  <p className="text-muted-foreground text-sm font-medium">Categories</p>

                  <div className="flex justify-center">
                    <AllocationDonutChart
                      centerValue={categoryCenterValue}
                      className="max-w-[min(100%,160px)]"
                      config={DEMO_DONUT_CONFIG}
                      data={DEMO_DONUT_DATA}
                      highlightedIndex={categoryHover}
                      muteOpacity={0.22}
                      onHighlightedIndexChange={setCategoryHover}
                      sizeClassName="h-[130px] w-full sm:h-[150px]"
                      sliceHighlight
                      tooltipDisabled
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-x-3 gap-y-3.5 text-sm">
                    {DEMO_CATEGORIES.map((c, i) => (
                      <div
                        className={cn(
                          "min-w-0 space-y-1 transition-opacity duration-150",
                          categoryHover !== null && categoryHover !== i && "opacity-[0.28]",
                        )}
                        key={c.key}
                        onMouseEnter={() => setCategoryHover(i)}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-muted-foreground truncate">{c.label}</span>
                        </div>
                        <p className="text-foreground pl-4 font-semibold tabular-nums">{c.pct}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main grid */}
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Recent transactions */}
          <section aria-label="Recent transactions" className="h-full min-w-0 w-full">
            <Card
              variant="subtle"
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4"
            >
              <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
                <h2 className="text-foreground text-lg font-medium">Recent transactions</h2>
                <ul className="flex flex-col gap-0">
                  {DEMO_TRANSACTIONS.map((tx) => {
                    const isInflow = tx.amount > 0;
                    return (
                      <li
                        className="flex min-w-0 items-center justify-between gap-3 py-3"
                        key={tx.id}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <MerchantLogo
                            className="size-10 shrink-0"
                            counterparties={null}
                            deferUntilVisible={false}
                            logoUrl={tx.logoUrl}
                            merchantName={tx.name}
                            website={tx.website}
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-foreground truncate text-left font-medium">
                              {tx.name}
                            </p>
                            <p className="text-muted-foreground text-left text-sm">{tx.date}</p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-base font-semibold tabular-nums",
                            isInflow ? "text-green-550" : "text-foreground",
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
            </Card>
          </section>

          {/* Subscriptions calendar */}
          <DashboardCalendarCard />

          {/* Portfolio performance */}
          <section aria-label="Portfolio holdings performance" className="h-full min-w-0 w-full">
            <Card
              variant="subtle"
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4"
            >
              <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
                <h2 className="text-foreground text-lg font-medium">Portfolio performance</h2>
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
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-foreground text-left text-sm font-semibold tracking-tight">
                              {holding.symbol}
                            </p>
                            <p className="text-muted-foreground truncate text-left text-sm">
                              {holding.name}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-base font-semibold tabular-nums",
                            up && "text-green-550",
                            down && "text-red-600 dark:text-red-500",
                            !up && !down && "text-foreground",
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
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
