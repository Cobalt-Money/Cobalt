import { cn } from "@cobalt-web/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  ChartCrosshairHover,
  ChartPeriod,
} from "@/components/research/lightweight-price-chart";
import { LightweightPriceChart } from "@/components/research/lightweight-price-chart";
import { TickerDetailAbout } from "@/components/research/ticker-detail-sections";
import type { TickerQuote } from "@/components/research/use-ticker-data";
import {
  useChart,
  useOverview,
  useQuote,
} from "@/components/research/use-ticker-data";
import { useAmbientInset } from "@/components/shell/ambient-inset-context";

/**
 * Left inset so body lines up with {@link ResearchTickerHeader}'s logo: `size-9`
 * back control + `gap-2` / `gap-2.5`, with the link's `-ml-1` folded in.
 */
const TICKER_BODY_ALIGN_CLASS =
  "pl-[calc(2.25rem+0.5rem-0.25rem)] sm:pl-[calc(2.25rem+0.625rem-0.25rem)]";

/** Cancels `SidebarShellLayout` horizontal padding so the chart spans the full main column. */
const CHART_FULL_WIDTH_CLASS = "-mx-4 min-w-0 w-auto lg:-mx-6";

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

function parseNum(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseFloat(raw.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function fmtPct(raw: unknown): string {
  const n = parseNum(raw);
  if (n === null) {
    return "—";
  }
  const pct = n <= 1 && n >= -1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) {
    return "—";
  }
  return n.toFixed(decimals);
}

function extractDescription(overview: Record<string, unknown> | null): string {
  if (!overview) {
    return "";
  }
  if (typeof overview.Description === "string") {
    return overview.Description.trim();
  }
  if (typeof overview.description === "string") {
    return (overview.description as string).trim();
  }
  return "";
}

function buildKpiRows(
  overview: Record<string, unknown>
): { label: string; value: string }[] {
  const cap = parseNum(
    overview.MarketCapitalization ?? overview.marketCap ?? overview.mktCap
  );
  const ev = parseNum(overview.EVToRevenue ?? overview.evToRevenue);
  const pe = parseNum(overview.PERatio ?? overview.peRatioTTM ?? overview.pe);
  const rev = parseNum(overview.RevenueTTM ?? overview.revenue);
  const eps = parseNum(overview.EPS ?? overview.eps);
  const beta = parseNum(overview.Beta ?? overview.beta);
  const rawSector = overview.Sector ?? overview.sector;
  const sector =
    typeof rawSector === "string" && rawSector.trim() ? rawSector : "—";

  return [
    { label: "Mkt cap", value: cap === null ? "—" : formatMarketCap(cap) },
    { label: "EV / Sales", value: fmtNum(ev) },
    { label: "P/E", value: fmtNum(pe) },
    { label: "FY revenue", value: rev === null ? "—" : formatMarketCap(rev) },
    { label: "EPS", value: fmtNum(eps) },
    {
      label: "Profit margin",
      value: fmtPct(overview.ProfitMargin ?? overview.profitMargin),
    },
    { label: "Beta", value: fmtNum(beta) },
    {
      label: "Div yield",
      value: fmtPct(overview.DividendYield ?? overview.dividendYield),
    },
    { label: "Sector", value: sector },
  ];
}

// ── Sub-components ────────────────────────────────────────────────

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
        <p className="text-muted-foreground text-sm tabular-nums">
          {crosshair.timeLabel}
        </p>
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

function KpiGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {rows.map((row) => (
        <div
          className="rounded-xl border border-border/50 bg-card/30 px-3 py-2 backdrop-blur-sm"
          key={row.label}
        >
          <p className="text-muted-foreground text-xs">{row.label}</p>
          <p className="font-medium text-sm tabular-nums">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function InlineLoader({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function TickerDetailPage({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase();
  const { dominantHex, setResearchTicker } = useAmbientInset();

  const { data: quote, loading: quoteLoading } = useQuote(sym);
  const { data: overview, loading: overviewLoading } = useOverview(sym);
  const [period, setPeriod] = useState<ChartPeriod>("1M");
  const [chartCrosshair, setChartCrosshair] =
    useState<ChartCrosshairHover | null>(null);
  const { data: chartPoints, loading: chartLoading } = useChart(sym, period);

  const companyName = useMemo(() => {
    if (quote?.companyName) {
      return quote.companyName;
    }
    if (overview && typeof overview.Name === "string") {
      return overview.Name;
    }
    if (overview && typeof overview.companyName === "string") {
      return overview.companyName as string;
    }
    return null;
  }, [quote?.companyName, overview]);

  useEffect(() => {
    setResearchTicker(sym, companyName);
    return () => setResearchTicker(null);
  }, [companyName, setResearchTicker, sym]);

  useEffect(() => {
    setChartCrosshair(null);
  }, [period, sym]);

  const chartColor =
    dominantHex && /^#[0-9a-f]{6}$/i.test(dominantHex)
      ? dominantHex
      : undefined;

  const description = extractDescription(overview);
  const changeClass =
    (quote?.change ?? 0) < 0
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400";

  const kpiRows = useMemo(
    () => (overview ? buildKpiRows(overview) : []),
    [overview]
  );

  // ── Price block ──────────────────────────────────────────────────

  let priceBlock: React.ReactNode;
  if (quoteLoading && !quote) {
    priceBlock = <InlineLoader text="Loading quote…" />;
  } else if (quote) {
    priceBlock = (
      <QuoteDisplay
        changeClass={changeClass}
        crosshair={chartCrosshair}
        quote={quote}
      />
    );
  } else {
    priceBlock = (
      <p className="text-muted-foreground text-sm">Quote unavailable</p>
    );
  }

  // ── KPI block ────────────────────────────────────────────────────

  let kpiBlock: React.ReactNode = null;
  if (overviewLoading && !overview) {
    kpiBlock = <InlineLoader text="Loading fundamentals…" />;
  } else if (kpiRows.length > 0) {
    kpiBlock = <KpiGrid rows={kpiRows} />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-8 pt-1">
      <div className={TICKER_BODY_ALIGN_CLASS}>
        <div className="flex flex-col gap-1">{priceBlock}</div>
      </div>

      {chartLoading && chartPoints.length === 0 ? (
        <div
          className={cn(
            "relative flex min-h-[400px] h-[400px] items-center justify-center",
            CHART_FULL_WIDTH_CLASS
          )}
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LightweightPriceChart
          chartClassName={CHART_FULL_WIDTH_CLASS}
          data={chartPoints}
          lineColor={chartColor}
          onCrosshairHover={setChartCrosshair}
          period={period}
          periodToolbarClassName={TICKER_BODY_ALIGN_CLASS}
          setPeriod={setPeriod}
        />
      )}

      <div className={cn("flex flex-col gap-6", TICKER_BODY_ALIGN_CLASS)}>
        {kpiBlock}

        <TickerDetailAbout description={description} />
      </div>
    </div>
  );
}
