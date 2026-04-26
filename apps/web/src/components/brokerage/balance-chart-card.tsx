import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { BrokerageScopePicker } from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Button } from "@cobalt-web/ui/components/button";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format, startOfYear, subDays, subMonths, subYears } from "date-fns";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  useActiveTooltipDataPoints,
  XAxis,
  YAxis,
} from "recharts";

import type { PositionRow } from "./positions-table";

export interface PortfolioSnapshotRow {
  id: string;
  accountId: string;
  snapshotDate: number;
  totalValue?: number | null;
}

export type { PositionRow } from "./positions-table";

interface ChartPoint {
  display: string;
  label: number;
  v: number;
}

const BALANCE_CHART_RANGE_OPTIONS = [
  "1W",
  "1M",
  "3M",
  "YTD",
  "1Y",
  "5Y",
  "All",
] as const;

type BalanceChartRange = (typeof BALANCE_CHART_RANGE_OPTIONS)[number];

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function rangeStartEpoch(range: BalanceChartRange): number {
  const now = new Date();
  switch (range) {
    case "1W": {
      return subDays(now, 7).getTime();
    }
    case "1M": {
      return subMonths(now, 1).getTime();
    }
    case "3M": {
      return subMonths(now, 3).getTime();
    }
    case "YTD": {
      return startOfYear(now).getTime();
    }
    case "1Y": {
      return subYears(now, 1).getTime();
    }
    case "5Y": {
      return subYears(now, 5).getTime();
    }
    case "All": {
      return 0;
    }
    default: {
      return 0;
    }
  }
}

function ChartHoverSync({
  setHoveredValue,
  setHoveredDate,
}: {
  setHoveredValue: (v: number | null) => void;
  setHoveredDate: (d: string | null) => void;
}) {
  const dataPoints = useActiveTooltipDataPoints<ChartPoint>();
  useEffect(() => {
    const pt = dataPoints?.[0];
    setHoveredValue(pt?.v ?? null);
    setHoveredDate(pt?.display ?? null);
  }, [dataPoints, setHoveredValue, setHoveredDate]);
  return null;
}

export function BalanceChartCard({
  portfolioSnapshots,
  positions,
  scopedAccountIds,
  scopeAccounts,
  brokerageScope,
  onScopeChange,
}: {
  portfolioSnapshots: readonly PortfolioSnapshotRow[];
  positions: readonly PositionRow[];
  scopedAccountIds: ReadonlySet<string> | null;
  scopeAccounts: ScopeAccount[];
  brokerageScope: BrokerageScope;
  onScopeChange: (scope: BrokerageScope) => void;
}) {
  const [balanceChartRange, setBalanceChartRange] =
    useState<BalanceChartRange>("1M");
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const coloredLayerRef = useRef<HTMLDivElement>(null);

  const handleChartMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const container = chartContainerRef.current;
    const coloredEl = coloredLayerRef.current;
    if (!container || !coloredEl) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rightPct = Math.max(0, Math.min(100, (1 - x / rect.width) * 100));
    coloredEl.style.clipPath = `inset(0 ${rightPct.toFixed(2)}% 0 0)`;
  }, []);

  const handleChartMouseLeave = useCallback(() => {
    const coloredEl = coloredLayerRef.current;
    if (coloredEl) {
      coloredEl.style.clipPath = "";
    }
  }, []);

  const latestValue = useMemo(() => {
    const scopedSnaps =
      scopedAccountIds === null
        ? portfolioSnapshots
        : portfolioSnapshots.filter((s) => scopedAccountIds.has(s.accountId));
    let snaptradePart = 0;
    if (scopedSnaps.length > 0) {
      const maxDate = Math.max(...scopedSnaps.map((s) => s.snapshotDate));
      for (const s of scopedSnaps) {
        if (s.snapshotDate === maxDate) {
          snaptradePart += s.totalValue ?? 0;
        }
      }
    }
    let livePart = 0;
    for (const p of positions) {
      const acctId = p.accountId ?? p.brokerageAccount?.id ?? null;
      if (acctId === null) {
        continue;
      }
      if (scopedAccountIds !== null && !scopedAccountIds.has(acctId)) {
        continue;
      }
      if (typeof p.institutionValue === "number") {
        livePart += p.institutionValue;
      }
    }
    if (scopedSnaps.length === 0 && livePart === 0) {
      return null;
    }
    return snaptradePart + livePart;
  }, [portfolioSnapshots, positions, scopedAccountIds]);

  const chartPoints = useMemo(() => {
    const cutoff = rangeStartEpoch(balanceChartRange);
    const filtered = portfolioSnapshots.filter((s) => {
      if (s.snapshotDate < cutoff) {
        return false;
      }
      if (scopedAccountIds !== null && !scopedAccountIds.has(s.accountId)) {
        return false;
      }
      return true;
    });

    const byDate = new Map<number, number>();
    for (const s of filtered) {
      byDate.set(
        s.snapshotDate,
        (byDate.get(s.snapshotDate) ?? 0) + (s.totalValue ?? 0)
      );
    }

    return [...byDate.entries()]
      .toSorted((a, b) => a[0] - b[0])
      .map(([epoch, value]) => ({
        display: format(new Date(epoch), "MMM d, yyyy"),
        label: epoch,
        v: value,
      }));
  }, [portfolioSnapshots, scopedAccountIds, balanceChartRange]);

  let displayValue: string;
  if (hoveredValue !== null) {
    displayValue = money(hoveredValue);
  } else if (latestValue === null) {
    displayValue = "—";
  } else {
    displayValue = money(latestValue);
  }

  return (
    <CobaltCard className="flex h-full min-h-0 flex-col gap-0 rounded-3xl py-0 lg:min-h-[400px]">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 py-4">
        <div className="shrink-0 px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-foreground text-2xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                <PrivateAmount>{displayValue}</PrivateAmount>
              </p>
              <p
                className={cn(
                  "text-muted-foreground text-xs tabular-nums transition-opacity",
                  hoveredDate ? "opacity-100" : "opacity-0"
                )}
              >
                {hoveredDate ?? "\u00A0"}
              </p>
            </div>
            {scopeAccounts.length > 0 ? (
              <div className="flex w-full shrink-0 justify-end sm:w-auto">
                <BrokerageScopePicker
                  accounts={scopeAccounts}
                  onScopeChange={onScopeChange}
                  scope={brokerageScope}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div
          aria-label="Portfolio balance chart"
          ref={chartContainerRef}
          className="relative min-h-[200px] w-full min-w-0 flex-1 [&_.recharts-tooltip-cursor]:hidden"
          onMouseLeave={handleChartMouseLeave}
          onMouseMove={handleChartMouseMove}
          role="img"
        >
          <div className="absolute inset-0">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={chartPoints}
                margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
              >
                <Tooltip content={() => null} />
                <ChartHoverSync
                  setHoveredDate={setHoveredDate}
                  setHoveredValue={setHoveredValue}
                />
                <XAxis dataKey="label" hide />
                <YAxis domain={["auto", "auto"]} hide width={0} />
                <Area
                  dataKey="v"
                  fill="transparent"
                  isAnimationActive={false}
                  stroke="rgba(120,120,130,0.45)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div
            ref={coloredLayerRef}
            className="pointer-events-none absolute inset-0"
          >
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={chartPoints}
                margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
              >
                <defs>
                  <linearGradient
                    id="balanceChartFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-green-550)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-green-550)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis domain={["auto", "auto"]} hide width={0} />
                <Area
                  dataKey="v"
                  fill="url(#balanceChartFill)"
                  isAnimationActive={false}
                  stroke="var(--color-green-550)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div
          aria-label="Chart time range"
          className="flex min-h-8 shrink-0 flex-wrap items-center justify-center gap-1 px-5"
          role="toolbar"
        >
          {BALANCE_CHART_RANGE_OPTIONS.map((t) => {
            const selected = balanceChartRange === t;
            return (
              <Button
                aria-pressed={selected}
                className="h-8 min-w-8 shrink-0 px-2 text-xs font-medium tabular-nums"
                key={t}
                onClick={() => setBalanceChartRange(t)}
                size="sm"
                type="button"
                variant={selected ? "outline" : "ghost"}
              >
                {t}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </CobaltCard>
  );
}
