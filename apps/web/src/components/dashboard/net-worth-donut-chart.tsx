import type { ChartConfig } from "@cobalt-web/ui/components/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@cobalt-web/ui/components/chart";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

/** Default ring — liquid / growth / income / core (demo proportions). */
const defaultBudgetConfig = {
  core: { color: "#4ade80", label: "Core" },
  growth: { color: "#fb923c", label: "Growth" },
  income: { color: "#facc15", label: "Income" },
  liquid: { color: "#7dd3fc", label: "Liquid" },
} satisfies ChartConfig;

export type DefaultBudgetSliceKey = keyof typeof defaultBudgetConfig;

export interface DefaultBudgetSlice {
  name: DefaultBudgetSliceKey;
  value: number;
}

const DEFAULT_BUDGET_SLICES: readonly DefaultBudgetSlice[] = [
  { name: "liquid", value: 15 },
  { name: "growth", value: 30 },
  { name: "income", value: 20 },
  { name: "core", value: 35 },
];

const DEFAULT_MUTE_OPACITY = 0.22;

function DonutCenterOverlay({ centerValue }: { centerValue?: string }) {
  if (!centerValue?.trim()) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-1 text-center"
    >
      <p className="text-foreground max-w-[10rem] text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {centerValue}
      </p>
    </div>
  );
}

export interface AllocationDonutChartProps {
  /** Amount only (e.g. formatted currency) in the donut hole; omit to hide. */
  centerValue?: string;
  className?: string;
  config: ChartConfig;
  data: readonly { name: string; value: number }[];
  highlightedIndex?: number | null;
  muteOpacity?: number;
  onHighlightedIndexChange?: (index: number | null) => void;
  sizeClassName?: string;
  sliceHighlight?: boolean;
  tooltipDisabled?: boolean;
}

/**
 * Shadcn-style donut: {@link ChartContainer} + `Pie` with gaps (`paddingAngle`)
 * and rounded segments (`cornerRadius`). Optional center amount + slice highlight/mute.
 */
export function AllocationDonutChart({
  centerValue,
  className,
  config,
  data,
  highlightedIndex: highlightedIndexProp,
  muteOpacity = DEFAULT_MUTE_OPACITY,
  onHighlightedIndexChange,
  sizeClassName = "h-[220px] w-full sm:h-[260px]",
  sliceHighlight = false,
  tooltipDisabled = false,
}: AllocationDonutChartProps) {
  const [internalHighlight, setInternalHighlight] = useState<number | null>(
    null
  );

  const isControlled = highlightedIndexProp !== undefined;
  const highlightedIndex = isControlled
    ? highlightedIndexProp
    : internalHighlight;

  const setHighlightedIndex = (index: number | null) => {
    if (isControlled) {
      onHighlightedIndexChange?.(index);
    } else {
      setInternalHighlight(index);
    }
  };

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        fill: `var(--color-${row.name})`,
      })),
    [data]
  );

  const highlightActive = sliceHighlight && highlightedIndex !== null;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-[min(100%,280px)] justify-center",
        className
      )}
      onMouseLeave={() => {
        if (sliceHighlight && !isControlled) {
          setHighlightedIndex(null);
        }
      }}
    >
      <ChartContainer
        className={cn("aspect-square", sizeClassName)}
        config={config}
        initialDimension={{ height: 260, width: 260 }}
      >
        <PieChart margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
          {tooltipDisabled ? null : (
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? `${value}%` : undefined
                  }
                  hideLabel
                  indicator="dot"
                />
              }
            />
          )}
          <Pie
            cornerRadius={10}
            cx="50%"
            cy="50%"
            data={chartData}
            dataKey="value"
            innerRadius="70%"
            isAnimationActive={false}
            nameKey="name"
            onMouseEnter={
              sliceHighlight
                ? (_, index) => setHighlightedIndex(index)
                : undefined
            }
            outerRadius="92%"
            paddingAngle={4}
            stroke="transparent"
            strokeWidth={0}
          >
            {chartData.map((row, i) => (
              <Cell
                fill={row.fill}
                fillOpacity={
                  highlightActive && highlightedIndex !== i ? muteOpacity : 1
                }
                key={row.name}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <DonutCenterOverlay centerValue={centerValue} />
    </div>
  );
}

export interface NetWorthDonutChartProps {
  centerValue: string;
  className?: string;
  slices?: readonly DefaultBudgetSlice[];
}

/** Four-segment budget-style donut (defaults match the design reference). */
export function NetWorthDonutChart({
  centerValue,
  className,
  slices = DEFAULT_BUDGET_SLICES,
}: NetWorthDonutChartProps) {
  return (
    <AllocationDonutChart
      centerValue={centerValue}
      className={className}
      config={defaultBudgetConfig}
      data={slices}
      sliceHighlight
    />
  );
}
