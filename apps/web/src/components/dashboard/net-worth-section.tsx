import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Button } from "@cobalt-web/ui/components/button";
import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AllocationDonutChart } from "@/components/dashboard/net-worth-donut-chart";

const formatUsdInteger = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const formatUsdPlain = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

const formatAxisK = (v: number) => `${Math.round(v / 1000)}K`;

const TIME_RANGES = ["Live", "1 Week", "1 Month", "1 Year", "All"] as const;

type TimeRange = (typeof TIME_RANGES)[number];

/** Demo headline — swap for live data later. */
const HEADLINE = {
  total: 728_510,
} as const;

const JUL_INDEX = 6;

const MONTHLY_VALUES = [
  698_200, 702_100, 705_800, 704_200, 708_900, 707_400, 710_415, 712_800,
  716_200, 719_400, 723_100, 728_200,
] as const;

const CHART_DATA = (
  [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ] as const
).map((month, i) => ({
  month,
  value: MONTHLY_VALUES[i] ?? 0,
}));

const CATEGORIES = [
  { color: "#3b82f6", label: "Accounts", pct: 38 },
  { color: "#38bdf8", label: "Stocks", pct: 17 },
  { color: "#14b8a6", label: "Crypto", pct: 14 },
  { color: "#a855f7", label: "Real Estate", pct: 11 },
  { color: "#6366f1", label: "Cars", pct: 10 },
  { color: "#ec4899", label: "Other", pct: 10 },
] as const;

const CATEGORY_SLICE_KEYS = [
  "accounts",
  "stocks",
  "crypto",
  "realEstate",
  "cars",
  "other",
] as const;

function NetWorthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly {
    payload?: { month?: string; value?: number };
    value?: number;
  }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  const v = row?.value ?? payload[0]?.value;
  if (v === undefined) {
    return null;
  }
  const short = row?.month?.trim() ?? "";
  const monthLabel =
    short.length > 0
      ? `${short.charAt(0)}${short.slice(1).toLowerCase()} 24`
      : "";

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-md",
        "text-popover-foreground text-xs"
      )}
    >
      <p className="text-muted-foreground font-medium">{monthLabel}</p>
      <p className="text-foreground font-semibold tabular-nums">
        {formatUsdPlain(v)}
      </p>
    </div>
  );
}

export function NetWorthSection() {
  const [range, setRange] = useState<TimeRange>("1 Year");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [categoryHover, setCategoryHover] = useState<number | null>(null);

  const yDomain = useMemo((): [number, number] => {
    const vals = CHART_DATA.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08;
    return [min - pad, max + pad];
  }, []);

  const categoryDonutConfig = useMemo((): ChartConfig => {
    const out: Record<string, { color: string; label: string }> = {};
    for (const [i, key] of CATEGORY_SLICE_KEYS.entries()) {
      const c = CATEGORIES[i];
      out[key] = { color: c.color, label: c.label };
    }
    return out;
  }, []);

  const categoryDonutData = useMemo(
    () =>
      CATEGORY_SLICE_KEYS.map((name, i) => ({
        name,
        value: CATEGORIES[i].pct,
      })),
    []
  );

  const activeBarIndex = hoverIndex ?? JUL_INDEX;

  const categoryCenterValue =
    categoryHover === null
      ? undefined
      : formatUsdInteger(
          Math.round((HEADLINE.total * CATEGORIES[categoryHover].pct) / 100)
        );

  return (
    <section aria-label="Net worth overview" className="w-full min-w-0">
      <CobaltCard className="overflow-hidden rounded-3xl py-3">
        <CardContent className="p-0">
          <div className="flex flex-col lg:min-h-[380px] lg:flex-row lg:items-stretch">
            {/* Trend — bar chart */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-5 sm:gap-5 sm:px-6">
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Total Net Worth
                </p>
                <p className="text-foreground text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                  {formatUsdInteger(HEADLINE.total)}
                </p>
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
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-medium"
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

              <div className="text-muted-foreground min-h-[200px] w-full min-w-0 flex-1 sm:min-h-[220px] [&_.recharts-cartesian-axis-tick-value]:tabular-nums">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart
                    barCategoryGap="12%"
                    data={CHART_DATA}
                    margin={{ bottom: 4, left: 4, right: 8, top: 8 }}
                  >
                    <XAxis
                      axisLine={false}
                      dataKey="month"
                      interval={0}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      domain={yDomain}
                      orientation="right"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                      tickFormatter={formatAxisK}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      content={<NetWorthTooltip />}
                      cursor={{
                        fill: "var(--muted)",
                        opacity: 0.15,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      maxBarSize={40}
                      onMouseEnter={(_, index) => setHoverIndex(index)}
                      onMouseLeave={() => setHoverIndex(null)}
                      radius={[12, 12, 12, 12]}
                    >
                      {CHART_DATA.map((row, i) => (
                        <Cell
                          fill={
                            i === activeBarIndex
                              ? "var(--foreground)"
                              : "var(--color-green-550)"
                          }
                          key={row.month}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Categories — donut + slice breakdown */}
            <div
              className={cn(
                "border-border/60 flex w-full shrink-0 flex-col gap-4 border-t px-5 sm:px-6",
                "lg:w-[min(100%,20rem)] lg:border-t-0 lg:border-l"
              )}
              onMouseLeave={() => setCategoryHover(null)}
            >
              <p className="text-muted-foreground text-sm font-medium">
                Categories
              </p>
              <div className="flex justify-center">
                <AllocationDonutChart
                  centerValue={categoryCenterValue}
                  className="max-w-[min(100%,220px)]"
                  config={categoryDonutConfig}
                  data={categoryDonutData}
                  highlightedIndex={categoryHover}
                  muteOpacity={0.22}
                  onHighlightedIndexChange={setCategoryHover}
                  sizeClassName="h-[180px] w-full sm:h-[200px]"
                  sliceHighlight
                  tooltipDisabled
                />
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-3.5 text-sm">
                {CATEGORIES.map((c, i) => (
                  <div
                    className={cn(
                      "min-w-0 space-y-1 transition-opacity duration-150",
                      categoryHover !== null &&
                        categoryHover !== i &&
                        "opacity-[0.28]"
                    )}
                    key={c.label}
                    onMouseEnter={() => setCategoryHover(i)}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-muted-foreground truncate">
                        {c.label}
                      </span>
                    </div>
                    <p className="text-foreground pl-4 font-semibold tabular-nums">
                      {c.pct}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </CobaltCard>
    </section>
  );
}
