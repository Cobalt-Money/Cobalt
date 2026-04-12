"use client";

import { cn } from "@cobalt-web/ui/lib/utils";
import { useState } from "react";

import {
  ChartPeriodToolbar,
  LightweightPriceChart,
} from "@/components/research/lightweight-price-chart";
import type { ChartPeriod } from "@/components/research/lightweight-price-chart";
import {
  mockChartPoints,
  mockQuote,
} from "@/components/research/ticker-detail-mock";

const MOCK_SYMBOL = "TSLA";

const MOCK_METRICS = [
  { label: "Market cap", value: "$1.07T" },
  { label: "P/E ratio", value: "82.4" },
  { label: "Revenue", value: "$97.7B" },
  { label: "Sector", value: "Consumer Discretionary" },
  { label: "Industry", value: "Auto Manufacturers" },
  { label: "Country", value: "United States" },
  { label: "CEO", value: "Elon Musk" },
];

export function BabyResearch() {
  const [period, setPeriod] = useState<ChartPeriod>("1M");

  const quote = mockQuote(MOCK_SYMBOL);
  const chartPoints = mockChartPoints(period, MOCK_SYMBOL);

  const isPositive = quote.change >= 0;
  const changeClass = isPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-8 pt-1 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold text-3xl leading-normal tabular-nums tracking-tight">
            $
            {quote.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}
          </p>
          <p className={cn("text-sm tabular-nums", changeClass)}>
            {isPositive ? "+" : ""}
            {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
            {quote.changePercent.toFixed(2)}%)
          </p>
        </div>
        <ChartPeriodToolbar period={period} setPeriod={setPeriod} />
      </div>

      <LightweightPriceChart
        data={chartPoints}
        period={period}
        setPeriod={setPeriod}
        showPeriodToolbar={false}
      />

      <section aria-label="Key metrics" className="flex flex-col gap-4">
        <h2 className="font-semibold text-foreground text-lg tracking-tight sm:text-xl">
          Key metrics
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {MOCK_METRICS.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-muted-foreground text-sm font-medium leading-snug">
                {label}
              </dt>
              <dd className="font-semibold text-foreground text-base tabular-nums leading-snug sm:text-lg">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-foreground text-lg tracking-tight sm:text-xl">
          Description
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Tesla designs, develops, manufactures, leases, and sells electric
          vehicles, energy generation and storage systems, and related services
          worldwide. The company operates through two segments: Automotive, and
          Energy Generation and Storage.
        </p>
      </section>
    </div>
  );
}
