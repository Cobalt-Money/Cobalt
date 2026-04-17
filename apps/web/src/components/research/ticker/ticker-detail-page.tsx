import { cn } from "@cobalt-web/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  chartQueryOptions,
  overviewQueryOptions,
  quoteQueryOptions,
  screenerRowFor,
  screenerRowToQuote,
} from "@/components/research/research-queries";
import type { TickerQuote } from "@/components/research/research-queries";
import type {
  ChartCrosshairHover,
  ChartPeriod,
} from "@/components/research/ticker/lightweight-price-chart";
import {
  ChartPeriodToolbar,
  LightweightPriceChart,
} from "@/components/research/ticker/lightweight-price-chart";
import { TickerDetailAbout } from "@/components/research/ticker/ticker-detail-sections";
import { useAmbientInset } from "@/components/shell/ambient-inset-context";

/**
 * Left inset so body lines up with {@link ResearchTickerHeader}'s logo: `icon-sm`
 * (`size-8`) back control + `gap-2` / `gap-2.5`, with the link's `-ml-1` folded in.
 */
const TICKER_BODY_ALIGN_CLASS =
  "pl-[calc(2rem+0.5rem-0.25rem)] sm:pl-[calc(2rem+0.625rem-0.25rem)]";

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

function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) {
    return "—";
  }
  return n.toFixed(decimals);
}

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function websiteLabel(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  try {
    const host = new URL(websiteHref(t)).hostname.replace(/^www\./i, "");
    return host || t;
  } catch {
    return t;
  }
}

function overviewStr(
  o: Record<string, unknown>,
  camelKey: string,
  pascalKey: string
): string | null {
  const a = o[camelKey];
  if (typeof a === "string" && a.trim()) {
    return a.trim();
  }
  const b = o[pascalKey];
  if (typeof b === "string" && b.trim()) {
    return b.trim();
  }
  return null;
}

interface KeyMetricRow {
  href?: string;
  label: string;
  value: string;
}

function overviewNumericFields(o: Record<string, unknown>) {
  const cap = parseNum(
    o.marketCap ?? o.mktCap ?? o.MarketCapitalization ?? o.market_cap
  );
  const pe = parseNum(
    o.pe ?? o.peRatio ?? o.PERatio ?? o.peRatioTTM ?? o.trailingPE
  );
  const revenue = parseNum(
    o.revenue ?? o.RevenueTTM ?? o.totalRevenue ?? o.Revenue
  );
  return { cap, pe, revenue };
}

function overviewDisplayStrings(o: Record<string, unknown>) {
  return {
    ceo: overviewStr(o, "ceo", "CEO") ?? "—",
    country: overviewStr(o, "country", "Country") ?? "—",
    industry: overviewStr(o, "industry", "Industry") ?? "—",
    rawSite: overviewStr(o, "website", "Website") ?? "",
    sector: overviewStr(o, "sector", "Sector") ?? "—",
  };
}

function keyMetricsFromOverview(
  overview: Record<string, unknown>
): KeyMetricRow[] {
  const { cap, pe, revenue } = overviewNumericFields(overview);
  const { ceo, country, industry, rawSite, sector } =
    overviewDisplayStrings(overview);

  return [
    {
      label: "Market cap",
      value: cap === null ? "—" : formatMarketCap(cap),
    },
    { label: "P/E", value: fmtNum(pe) },
    {
      label: "Revenue",
      value: revenue === null ? "—" : formatMarketCap(revenue),
    },
    { label: "Sector", value: sector },
    { label: "Industry", value: industry },
    { label: "Country", value: country },
    { label: "CEO", value: ceo },
    {
      label: "Website",
      value: rawSite ? websiteLabel(rawSite) : "—",
      ...(rawSite ? { href: websiteHref(rawSite) } : {}),
    },
  ];
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

/** Rows from FMP `/overview` profile (camelCase) plus legacy Alpha Vantage-style keys. */
function useKeyMetricRows(overview: Record<string, unknown> | null) {
  return useMemo((): KeyMetricRow[] => {
    if (!overview) {
      return [];
    }
    return keyMetricsFromOverview(overview);
  }, [overview]);
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

function TickerKeyMetrics({ rows }: { rows: readonly KeyMetricRow[] }) {
  return (
    <section aria-label="Key metrics" className="w-full min-w-0">
      <h2 className="font-semibold text-foreground text-lg tracking-tight sm:text-xl">
        Key metrics
      </h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            <dt className="text-muted-foreground text-sm font-medium leading-snug">
              {row.label}
            </dt>
            <dd className="mt-1.5 min-w-0">
              {row.href ? (
                <a
                  className="text-primary font-semibold text-base leading-snug underline-offset-4 hover:underline sm:text-lg"
                  href={row.href}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {row.value}
                </a>
              ) : (
                <p
                  className={cn(
                    "font-semibold text-foreground text-base tabular-nums leading-snug sm:text-lg",
                    row.label === "CEO" ||
                      row.label === "Sector" ||
                      row.label === "Industry"
                      ? "break-words"
                      : ""
                  )}
                  title={
                    row.label === "CEO" ||
                    row.label === "Industry" ||
                    row.label === "Sector"
                      ? row.value
                      : undefined
                  }
                >
                  {row.value}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function TickerDetailPage({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase();
  const { dominantHex, setResearchTicker } = useAmbientInset();
  const queryClient = useQueryClient();

  const { data: quote, isLoading: quoteLoading } = useQuery({
    ...quoteQueryOptions(sym),
    placeholderData: () => {
      const row = screenerRowFor(queryClient, sym);
      return row ? screenerRowToQuote(row, sym) : undefined;
    },
  });
  const { data: overview } = useQuery({
    ...overviewQueryOptions(sym),
    placeholderData: () => screenerRowFor(queryClient, sym),
  });
  const [period, setPeriod] = useState<ChartPeriod>("1M");
  const [chartCrosshair, setChartCrosshair] =
    useState<ChartCrosshairHover | null>(null);
  const { data: chartPoints } = useQuery(chartQueryOptions(sym, period));

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

  const description = extractDescription(overview ?? null);
  const changeClass =
    (quote?.change ?? 0) < 0
      ? "text-red-600 dark:text-red-400"
      : "text-green-600 dark:text-green-400";

  const keyMetricRows = useKeyMetricRows(overview ?? null);

  // ── Price + fundamentals row ─────────────────────────────────────

  const priceRow: React.ReactNode = quote ? (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <QuoteDisplay
          changeClass={changeClass}
          crosshair={chartCrosshair}
          quote={quote}
        />
      </div>
      <ChartPeriodToolbar period={period} setPeriod={setPeriod} />
    </div>
  ) : (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        {quoteLoading ? null : (
          <p className="text-muted-foreground text-sm">Quote unavailable</p>
        )}
      </div>
      <ChartPeriodToolbar period={period} setPeriod={setPeriod} />
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 pb-8 pt-1">
      <div className={TICKER_BODY_ALIGN_CLASS}>{priceRow}</div>

      <LightweightPriceChart
        chartClassName={CHART_FULL_WIDTH_CLASS}
        data={chartPoints ?? []}
        lineColor={chartColor}
        onCrosshairHover={setChartCrosshair}
        period={period}
        setPeriod={setPeriod}
        showPeriodToolbar={false}
      />

      <div className={cn("flex flex-col gap-8", TICKER_BODY_ALIGN_CLASS)}>
        <TickerKeyMetrics rows={keyMetricRows} />
        <TickerDetailAbout description={description} />
      </div>
    </div>
  );
}
