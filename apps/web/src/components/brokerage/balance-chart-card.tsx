import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { BrokerageScopePicker } from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { AreaChart } from "@cobalt-web/ui/components/charts/area-chart";
import { Area } from "@cobalt-web/ui/components/charts/area";
import { ChartTooltip } from "@cobalt-web/ui/components/charts/tooltip";
import type { TooltipData } from "@cobalt-web/ui/components/charts/chart-context";
import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { Button } from "@cobalt-web/ui/components/button";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import NumberFlow from "@number-flow/react";
import { format, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

export interface PortfolioSnapshotRow {
  id: string;
  accountId: string;
  snapshotDate: number;
  totalValue?: number | null;
}

interface ChartPoint {
  time: number;
  value: number;
}

const BALANCE_CHART_RANGE_OPTIONS = ["1W", "1M", "3M", "YTD", "1Y", "5Y", "All"] as const;

type BalanceChartRange = (typeof BALANCE_CHART_RANGE_OPTIONS)[number];

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

export function BalanceChartCard({
  portfolioSnapshots,
  scopedAccountIds,
  scopeAccounts,
  brokerageScope,
  onScopeChange,
}: {
  portfolioSnapshots: readonly PortfolioSnapshotRow[];
  scopedAccountIds: ReadonlySet<string> | null;
  scopeAccounts: ScopeAccount[];
  brokerageScope: BrokerageScope;
  onScopeChange: (scope: BrokerageScope) => void;
}) {
  const [balanceChartRange, setBalanceChartRange] = useState<BalanceChartRange>("1M");
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const handleTooltipChange = useCallback((data: TooltipData | null) => {
    setHoveredPoint((data?.point as unknown as ChartPoint) ?? null);
  }, []);

  const latestValue = useMemo(() => {
    const scopedSnaps =
      scopedAccountIds === null
        ? portfolioSnapshots
        : portfolioSnapshots.filter((s) => scopedAccountIds.has(s.accountId));
    if (scopedSnaps.length === 0) {
      return null;
    }
    const maxDate = Math.max(...scopedSnaps.map((s) => s.snapshotDate));
    let total = 0;
    for (const s of scopedSnaps) {
      if (s.snapshotDate === maxDate) {
        total += s.totalValue ?? 0;
      }
    }
    return total;
  }, [portfolioSnapshots, scopedAccountIds]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
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
      byDate.set(s.snapshotDate, (byDate.get(s.snapshotDate) ?? 0) + (s.totalValue ?? 0));
    }

    return [...byDate.entries()]
      .toSorted((a, b) => a[0] - b[0])
      .map(([epoch, value]) => ({ time: epoch, value }));
  }, [portfolioSnapshots, scopedAccountIds, balanceChartRange]);

  const displayedAmount = hoveredPoint?.value ?? latestValue;
  const hoveredParts = useMemo(() => {
    if (!hoveredPoint) {
      return null;
    }
    const d = new Date(hoveredPoint.time);
    return {
      day: d.getDate(),
      month: format(d, "MMM"),
      year: d.getFullYear(),
    };
  }, [hoveredPoint]);

  return (
    <Card
      variant="subtle"
      className="flex h-full min-h-0 flex-col gap-0 rounded-3xl py-0 lg:min-h-[400px]"
    >
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 py-4">
        <div className="shrink-0 px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-foreground text-2xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                <PrivateAmount>
                  {displayedAmount === null ? (
                    "—"
                  ) : (
                    <NumberFlow
                      format={{
                        currency: "USD",
                        maximumFractionDigits: 0,
                        style: "currency",
                      }}
                      spinTiming={{ duration: 250, easing: "ease-out" }}
                      transformTiming={{ duration: 250, easing: "ease-out" }}
                      value={displayedAmount}
                    />
                  )}
                </PrivateAmount>
              </p>
              <div className="text-muted-foreground flex h-4 items-center gap-1 overflow-hidden text-xs tabular-nums">
                {hoveredParts ? (
                  <>
                    <div className="relative h-4 overflow-hidden">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          animate={{ opacity: 1, y: 0 }}
                          className="block"
                          exit={{ opacity: 0, y: -8 }}
                          initial={{ opacity: 0, y: 8 }}
                          key={hoveredParts.month}
                          transition={{ damping: 30, stiffness: 400, type: "spring" }}
                        >
                          {hoveredParts.month}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <NumberFlow
                      spinTiming={{ duration: 200, easing: "ease-out" }}
                      suffix=","
                      transformTiming={{ duration: 200, easing: "ease-out" }}
                      value={hoveredParts.day}
                    />
                    <div className="relative h-4 overflow-hidden">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          animate={{ opacity: 1, y: 0 }}
                          className="block"
                          exit={{ opacity: 0, y: -8 }}
                          initial={{ opacity: 0, y: 8 }}
                          key={hoveredParts.year}
                          transition={{ damping: 30, stiffness: 400, type: "spring" }}
                        >
                          {hoveredParts.year}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </>
                ) : null}
              </div>
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
        <div className="relative min-h-[200px] w-full min-w-0 flex-1">
          {chartPoints.length >= 2 ? (
            <AreaChart
              aspectRatio="auto"
              className="h-full"
              data={chartPoints as unknown as Record<string, unknown>[]}
              margin={{ bottom: 8, left: 0, right: 0, top: 8 }}
              onTooltipChange={handleTooltipChange}
              xDataKey="time"
            >
              <Area
                dataKey="value"
                fill="var(--color-green-550)"
                stroke="var(--color-green-550)"
                strokeWidth={2}
              />
              <ChartTooltip showBox={false} showDatePill={false} showDots={true} />
            </AreaChart>
          ) : null}
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
    </Card>
  );
}
