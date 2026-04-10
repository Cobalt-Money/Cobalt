import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";

const CHART_PERIODS = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "All",
] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number];

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface ChartCrosshairHover {
  price: number;
  timeLabel: string;
}

interface LightweightPriceChartProps {
  /** Extra classes for the chart canvas wrapper (e.g. full-bleed negative margins). */
  chartClassName?: string;
  data: ChartDataPoint[];
  height?: number;
  lineColor?: string;
  /** When the user moves the crosshair, updates the parent (e.g. header price). Cleared when crosshair leaves the series. */
  onCrosshairHover?: (value: ChartCrosshairHover | null) => void;
  /** Classes for the period toolbar so it lines up with body content (e.g. header logo alignment). */
  periodToolbarClassName?: string;
  period: ChartPeriod;
  setPeriod: (p: ChartPeriod) => void;
}

function formatChartTimeLabel(tsSeconds: number, period: ChartPeriod): string {
  const d = new Date(tsSeconds * 1000);
  if (period === "1D" || period === "1W") {
    return d.toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    });
  }
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ThemeColors {
  areaBottomColor: string;
  areaTopColor: string;
  backgroundColor: string;
  borderColor: string;
  crosshairLabelBg: string;
  gridColor: string;
  lineColor: string;
  textColor: string;
}

function chartTheme(
  resolvedTheme: string | undefined,
  lineColor: string | undefined
): ThemeColors {
  const isDark = resolvedTheme !== "light";
  const line = lineColor ?? (isDark ? "#22c55e" : "#16a34a");

  if (isDark) {
    return {
      areaBottomColor: "rgba(0, 0, 0, 0)",
      areaTopColor: `${line}28`,
      backgroundColor: "transparent",
      borderColor: "rgba(255, 255, 255, 0.06)",
      crosshairLabelBg: "#1e1e24",
      gridColor: "rgba(255, 255, 255, 0.04)",
      lineColor: line,
      textColor: "#9ca3af",
    };
  }

  return {
    areaBottomColor: "rgba(255, 255, 255, 0)",
    areaTopColor: `${line}20`,
    backgroundColor: "transparent",
    borderColor: "rgba(0, 0, 0, 0.06)",
    crosshairLabelBg: "#f3f4f6",
    gridColor: "rgba(0, 0, 0, 0.04)",
    lineColor: line,
    textColor: "#6b7280",
  };
}

export function LightweightPriceChart({
  chartClassName,
  data,
  height = 400,
  lineColor,
  onCrosshairHover,
  periodToolbarClassName,
  period,
  setPeriod,
}: LightweightPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);
  const onCrosshairHoverRef = useRef(onCrosshairHover);
  onCrosshairHoverRef.current = onCrosshairHover;
  const periodRef = useRef(period);
  periodRef.current = period;

  const { resolvedTheme } = useTheme();

  const colors = chartTheme(resolvedTheme, lineColor);

  const applyTheme = useCallback(
    (chart: IChartApi, series: ISeriesApi<"Area", Time>) => {
      chart.applyOptions({
        crosshair: {
          horzLine: {
            color: colors.textColor,
            labelBackgroundColor: colors.crosshairLabelBg,
            labelVisible: false,
            style: 3,
            width: 1,
          },
          mode: CrosshairMode.Magnet,
          vertLine: {
            color: colors.textColor,
            labelBackgroundColor: colors.crosshairLabelBg,
            labelVisible: false,
            style: 3,
            width: 1,
          },
        },
        grid: {
          horzLines: { color: colors.gridColor, visible: false },
          vertLines: { color: colors.gridColor, visible: false },
        },
        layout: {
          background: { color: colors.backgroundColor, type: ColorType.Solid },
          textColor: colors.textColor,
        },
        leftPriceScale: {
          visible: false,
        },
        rightPriceScale: {
          borderVisible: false,
          visible: false,
        },
        timeScale: {
          borderVisible: false,
          visible: false,
        },
      });

      series.applyOptions({
        bottomColor: colors.areaBottomColor,
        lastValueVisible: false,
        lineColor: colors.lineColor,
        lineWidth: 2,
        topColor: colors.areaTopColor,
      });
    },
    [colors]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      crosshair: {
        horzLine: {
          color: colors.textColor,
          labelBackgroundColor: colors.crosshairLabelBg,
          labelVisible: false,
          style: 3,
          width: 1,
        },
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: colors.textColor,
          labelBackgroundColor: colors.crosshairLabelBg,
          labelVisible: false,
          style: 3,
          width: 1,
        },
      },
      grid: {
        horzLines: { color: colors.gridColor, visible: false },
        vertLines: { color: colors.gridColor, visible: false },
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      height,
      layout: {
        attributionLogo: false,
        background: { color: colors.backgroundColor, type: ColorType.Solid },
        textColor: colors.textColor,
      },
      leftPriceScale: {
        visible: false,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { bottom: 0.08, top: 0.08 },
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 2,
        timeVisible: true,
        visible: false,
      },
    });

    const series = chart.addSeries(AreaSeries, {
      bottomColor: colors.areaBottomColor,
      crosshairMarkerBackgroundColor: colors.lineColor,
      crosshairMarkerBorderColor: resolvedTheme === "light" ? "#fff" : "#111",
      crosshairMarkerRadius: 5,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      lineColor: colors.lineColor,
      lineWidth: 2,
      priceFormat: { minMove: 0.01, precision: 2, type: "price" },
      priceLineVisible: false,
      topColor: colors.areaTopColor,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const notify = onCrosshairHoverRef.current;
      if (!notify) {
        return;
      }
      if (!param.time || !param.point) {
        notify(null);
        return;
      }
      const val = param.seriesData.get(series);
      if (!val || !("value" in val)) {
        notify(null);
        return;
      }
      const ts = param.time as number;
      notify({
        price: val.value as number,
        timeLabel: formatChartTimeLabel(ts, periodRef.current),
      });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // only re-create chart when container mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) {
      return;
    }
    applyTheme(chart, series);
  }, [applyTheme]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) {
      return;
    }

    const formatted = data.map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    series.setData(formatted);
    chart.timeScale().fitContent();
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    chart.applyOptions({ height });
  }, [height]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className={cn("relative min-h-0 w-full min-w-0", chartClassName)}>
        <div ref={containerRef} className="h-full w-full min-w-0" />
      </div>
      <div
        aria-label="Chart time range"
        className={cn("flex flex-wrap gap-1", periodToolbarClassName)}
        role="toolbar"
      >
        {CHART_PERIODS.map((p) => (
          <Button
            aria-pressed={period === p}
            className="h-8 px-2 text-xs"
            key={p}
            onClick={() => setPeriod(p)}
            size="sm"
            type="button"
            variant={period === p ? "secondary" : "ghost"}
          >
            {p}
          </Button>
        ))}
      </div>
    </div>
  );
}
