import { cn } from "@cobalt-web/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type {
  ChartCrosshairHover,
  ChartPeriod,
} from "@/components/research/ticker/lightweight-price-chart";
import {
  ChartPeriodToolbar,
  LightweightPriceChart,
} from "@/components/research/ticker/lightweight-price-chart";
import { TickerDetailFundamentals } from "@/components/research/ticker/ticker-detail-fundamentals";
import { TickerResearchAmbientSync } from "@/components/research/ticker/ticker-research-ambient-sync";
import { useAmbientInset } from "@/components/shell/ambient-inset-context";
import { chartQuery, quoteQuery } from "@/hooks/research-queries";
import type { TickerQuote } from "@/hooks/research-queries";

function QuoteDisplay({
  changeClass,
  crosshair,
  quote,
}: {
  changeClass: string;
  crosshair: ChartCrosshairHover | null;
  quote: TickerQuote;
}) {
  const displayPrice = crosshair?.price ?? quote.currentPrice;
  return (
    <>
      <p className="font-semibold text-3xl leading-normal tabular-nums tracking-tight">
        $
        {displayPrice.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })}
      </p>
      {crosshair ? (
        <p className="text-muted-foreground text-sm tabular-nums">{crosshair.timeLabel}</p>
      ) : (
        <p className={cn("text-sm tabular-nums", changeClass)}>
          {quote.change >= 0 ? "+" : ""}
          {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
          {quote.changePercent.toFixed(2)}%)
        </p>
      )}
    </>
  );
}

export function TickerDetailPage({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase();
  const { dominantHex } = useAmbientInset();

  const { data: quote, isLoading: quoteLoading } = useQuery(quoteQuery(sym));
  const [period, setPeriod] = useState<ChartPeriod>("1M");
  const [chartCrosshair, setChartCrosshair] = useState<ChartCrosshairHover | null>(null);
  const { data: chartPoints } = useQuery(chartQuery(sym, period));

  useEffect(() => {
    setChartCrosshair(null);
  }, [period, sym]);

  const chartColor = dominantHex && /^#[0-9a-f]{6}$/i.test(dominantHex) ? dominantHex : undefined;

  const changeClass =
    (quote?.change ?? 0) < 0
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400";

  const priceRow = quote ? (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <QuoteDisplay changeClass={changeClass} crosshair={chartCrosshair} quote={quote} />
      </div>
      <ChartPeriodToolbar period={period} setPeriod={setPeriod} />
    </div>
  ) : (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        {quoteLoading ? null : <p className="text-muted-foreground text-sm">Quote unavailable</p>}
      </div>
      <ChartPeriodToolbar period={period} setPeriod={setPeriod} />
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col pb-8 pt-1">
      <TickerResearchAmbientSync quote={quote} symbol={symbol} />

      <div className="flex min-w-0 flex-col gap-6 pl-[calc(2rem+0.5rem-0.25rem)] sm:pl-[calc(2rem+0.625rem-0.25rem)]">
        {priceRow}

        <LightweightPriceChart
          chartClassName="-mx-4 min-w-0 w-auto lg:-mx-6"
          data={chartPoints ?? []}
          lineColor={chartColor}
          onCrosshairHover={setChartCrosshair}
          period={period}
          setPeriod={setPeriod}
          showPeriodToolbar={false}
        />

        <TickerDetailFundamentals symbol={symbol} />
      </div>
    </div>
  );
}
