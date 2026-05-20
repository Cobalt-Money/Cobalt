import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { BrokerageScopePicker } from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { Button } from "@cobalt-web/ui/components/button";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import type { CanvasHoverInfo } from "./balance-chart-canvas";
import { BalanceChartCanvas } from "./balance-chart-canvas";

export interface PortfolioSnapshotRow {
  id: string;
  accountId: string;
  snapshotDate: number;
  totalValue?: number | null;
}

const BALANCE_CHART_RANGE_OPTIONS = ["1W", "1M", "3M", "YTD", "1Y", "5Y", "All"] as const;

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
  const [hoveredPoint, setHoveredPoint] = useState<CanvasHoverInfo | null>(null);

  // Resting headline = sum of the most-recent snapshot row per scoped account.
  // snapshot.current already includes both cash + positions for snaptrade and
  // total account value for plaid investment, so don't add live position
  // values on top — that double-counts the positions component.
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
      byDate.set(s.snapshotDate, (byDate.get(s.snapshotDate) ?? 0) + (s.totalValue ?? 0));
    }

    return [...byDate.entries()]
      .toSorted((a, b) => a[0] - b[0])
      .map(([epoch, value]) => ({ time: epoch, value }));
  }, [portfolioSnapshots, scopedAccountIds, balanceChartRange]);

  const handleHoverChange = useCallback((info: CanvasHoverInfo | null) => {
    setHoveredPoint(info);
  }, []);

  let displayValue: string;
  if (hoveredPoint) {
    displayValue = money(hoveredPoint.value);
  } else if (latestValue === null) {
    displayValue = "—";
  } else {
    displayValue = money(latestValue);
  }
  const hoveredDate = hoveredPoint ? format(new Date(hoveredPoint.time), "MMM d, yyyy") : null;

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
                <PrivateAmount>{displayValue}</PrivateAmount>
              </p>
              <p
                className={cn(
                  "text-muted-foreground text-xs tabular-nums transition-opacity",
                  hoveredDate ? "opacity-100" : "opacity-0",
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
        <div className="relative min-h-[200px] w-full min-w-0 flex-1">
          <BalanceChartCanvas
            ariaLabel="Portfolio balance chart"
            onHoverChange={handleHoverChange}
            points={chartPoints}
          />
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
