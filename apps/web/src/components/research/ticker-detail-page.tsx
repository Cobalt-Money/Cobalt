import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useId, useMemo, useState } from "react";

import {
  mockChartPoints,
  mockNews,
  mockOverview,
  mockQuote,
} from "@/components/research/ticker-detail-mock";
import {
  TickerDetailNewsTabs,
  TickerDetailPriceChart,
} from "@/components/research/ticker-detail-sections";
import type { ChartPeriod } from "@/components/research/ticker-detail-sections";
import { useAmbientInset } from "@/components/shell/ambient-inset-context";

function formatMarketCap(n: number): string {
  if (n >= 1e12) {
    return `${(n / 1e12).toFixed(2)}T`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)}M`;
  }
  return n.toLocaleString();
}

function parseOverviewNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseFloat(raw.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pctOrRatioDisplay(raw: unknown): string {
  const n = parseOverviewNumber(raw);
  if (n === null) {
    return "—";
  }
  const pct = n <= 1 && n >= -1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

function overviewLabelValue(
  overview: Record<string, unknown>
): { label: string; value: string }[] {
  const cap = parseOverviewNumber(overview.MarketCapitalization);
  const ev = parseOverviewNumber(overview.EVToRevenue);
  const pe = parseOverviewNumber(overview.PERatio);
  const rev = parseOverviewNumber(overview.RevenueTTM);
  const eps = parseOverviewNumber(overview.EPS);
  const beta = parseOverviewNumber(overview.Beta);
  const sector =
    typeof overview.Sector === "string" && overview.Sector.trim()
      ? overview.Sector
      : "—";

  return [
    { label: "Mkt cap", value: cap === null ? "—" : formatMarketCap(cap) },
    { label: "EV / Sales", value: ev === null ? "—" : String(ev) },
    { label: "P/E", value: pe === null ? "—" : String(pe) },
    {
      label: "FY revenue",
      value: rev === null ? "—" : formatMarketCap(rev),
    },
    { label: "EPS", value: eps === null ? "—" : String(eps) },
    { label: "Profit margin", value: pctOrRatioDisplay(overview.ProfitMargin) },
    { label: "Beta", value: beta === null ? "—" : String(beta) },
    { label: "Div yield", value: pctOrRatioDisplay(overview.DividendYield) },
    { label: "Sector", value: sector },
  ];
}

export function TickerDetailPage({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase();
  const { dominantHex, setResearchTicker } = useAmbientInset();

  const quote = useMemo(() => mockQuote(sym), [sym]);
  const overview = useMemo(() => mockOverview(sym), [sym]);
  const companyLine = useMemo(
    () =>
      quote.companyName ??
      (typeof overview.Name === "string" ? overview.Name : null),
    [quote.companyName, overview.Name]
  );

  useEffect(() => {
    setResearchTicker(sym, companyLine);
    return () => setResearchTicker(null);
  }, [companyLine, setResearchTicker, sym]);

  const chartGradientId = `ticker-fill-${useId().replaceAll(":", "")}`;

  const chartStroke =
    dominantHex && /^#[0-9a-f]{6}$/i.test(dominantHex)
      ? dominantHex
      : "var(--color-green-550)";

  const [period, setPeriod] = useState<ChartPeriod>("1M");
  const news = useMemo(() => mockNews(sym), [sym]);
  const chartPoints = useMemo(
    () => mockChartPoints(period, sym),
    [period, sym]
  );

  const description =
    typeof overview.Description === "string" ? overview.Description.trim() : "";

  const changeNegative = quote.change < 0;
  const changeClass = changeNegative
    ? "text-red-600 dark:text-red-400"
    : "text-green-600 dark:text-green-400";

  const kpiRows = overviewLabelValue(overview);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-8 pt-1">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-3xl tabular-nums tracking-tight">
          $
          {quote.currentPrice.toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}
        </p>
        <p className={cn("text-sm tabular-nums", changeClass)}>
          {quote.change >= 0 ? "+" : ""}
          {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
          {quote.changePercent.toFixed(2)}%)
        </p>
      </div>

      <TickerDetailPriceChart
        chartGradientId={chartGradientId}
        chartPoints={chartPoints}
        chartStroke={chartStroke}
        period={period}
        setPeriod={setPeriod}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiRows.map((row) => (
          <div
            className="rounded-xl border border-border/50 bg-card/30 px-3 py-2 backdrop-blur-sm"
            key={row.label}
          >
            <p className="text-muted-foreground text-xs">{row.label}</p>
            <p className="font-medium text-sm tabular-nums">{row.value}</p>
          </div>
        ))}
      </div>

      <TickerDetailNewsTabs description={description} news={news} />
    </div>
  );
}
