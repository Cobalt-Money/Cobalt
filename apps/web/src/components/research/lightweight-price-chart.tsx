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
  crosshairLabelBg: string;
  crosshairMarkerBorderColor: string;
  gridColor: string;
  lineColor: string;
  mutedLineColor: string;
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
      crosshairLabelBg: "#1e1e24",
      crosshairMarkerBorderColor: "#111",
      gridColor: "rgba(255, 255, 255, 0.04)",
      lineColor: line,
      mutedLineColor: "rgba(120, 120, 130, 0.45)",
      textColor: "#9ca3af",
    };
  }

  return {
    areaBottomColor: "rgba(255, 255, 255, 0)",
    areaTopColor: `${line}20`,
    backgroundColor: "transparent",
    crosshairLabelBg: "#f3f4f6",
    crosshairMarkerBorderColor: "#fff",
    gridColor: "rgba(0, 0, 0, 0.04)",
    lineColor: line,
    mutedLineColor: "rgba(150, 150, 160, 0.4)",
    textColor: "#6b7280",
  };
}

/**
 * Shared chart options for layout / grid / scales.
 * Neither chart shows axes; only the base chart handles scroll/zoom.
 */
function sharedLayoutOptions(c: ThemeColors, height: number) {
  return {
    autoSize: true,
    grid: {
      horzLines: { color: c.gridColor, visible: false },
      vertLines: { color: c.gridColor, visible: false },
    },
    height,
    layout: {
      attributionLogo: false,
      background: { color: c.backgroundColor, type: ColorType.Solid },
      textColor: c.textColor,
    },
    leftPriceScale: { visible: false },
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
  } as const;
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
  /** Container for the base chart (captures events, crosshair marker, muted line on hover). */
  const baseContainerRef = useRef<HTMLDivElement>(null);
  /** Container for the colored chart (pointer-events: none, clip-path drives the split). */
  const coloredContainerRef = useRef<HTMLDivElement>(null);

  const baseChartRef = useRef<IChartApi | null>(null);
  const baseSeriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);
  const coloredChartRef = useRef<IChartApi | null>(null);
  const coloredSeriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);

  /** Tracks whether the crosshair is currently over the chart. */
  const isHoveringRef = useRef(false);

  const onCrosshairHoverRef = useRef(onCrosshairHover);
  onCrosshairHoverRef.current = onCrosshairHover;
  const periodRef = useRef(period);
  periodRef.current = period;
  const colorsRef = useRef<ThemeColors | null>(null);

  const { resolvedTheme } = useTheme();
  const colors = chartTheme(resolvedTheme, lineColor);
  colorsRef.current = colors;

  /**
   * Re-apply theme colors to both charts + series.
   * Called when the color palette changes (theme switch or lineColor prop change).
   */
  const applyTheme = useCallback(
    (
      baseChart: IChartApi,
      baseSeries: ISeriesApi<"Area", Time>,
      coloredChart: IChartApi,
      coloredSeries: ISeriesApi<"Area", Time>
    ) => {
      const c = colors;
      const sharedUpdate = {
        grid: {
          horzLines: { color: c.gridColor, visible: false },
          vertLines: { color: c.gridColor, visible: false },
        },
        layout: {
          background: { color: c.backgroundColor, type: ColorType.Solid },
          textColor: c.textColor,
        },
      };

      baseChart.applyOptions({
        ...sharedUpdate,
        crosshair: {
          horzLine: {
            color: c.textColor,
            labelBackgroundColor: c.crosshairLabelBg,
            labelVisible: false,
            style: 3,
            width: 1,
          },
          mode: CrosshairMode.Magnet,
          vertLine: {
            color: c.textColor,
            labelBackgroundColor: c.crosshairLabelBg,
            labelVisible: false,
            style: 3,
            width: 1,
          },
        },
      });
      coloredChart.applyOptions(sharedUpdate);

      // Base series: invisible line that anchors the crosshair; becomes muted when hovering.
      baseSeries.applyOptions({
        bottomColor: "transparent",
        crosshairMarkerBackgroundColor: c.lineColor,
        crosshairMarkerBorderColor: c.crosshairMarkerBorderColor,
        crosshairMarkerRadius: 5,
        crosshairMarkerVisible: true,
        lastValueVisible: false,
        lineColor: isHoveringRef.current ? c.mutedLineColor : "transparent",
        lineWidth: 2,
        topColor: "transparent",
      });

      coloredSeries.applyOptions({
        bottomColor: c.areaBottomColor,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        lineColor: c.lineColor,
        lineWidth: 2,
        topColor: c.areaTopColor,
      });
    },
    [colors]
  );

  // ── Mount: create both chart instances once ──────────────────────

  useEffect(() => {
    const baseContainer = baseContainerRef.current;
    const coloredContainer = coloredContainerRef.current;
    if (!baseContainer || !coloredContainer) {
      return;
    }

    const c = colorsRef.current ?? chartTheme(undefined, lineColor);
    const layout = sharedLayoutOptions(c, height);

    // ── Base chart ── handles all user interaction + crosshair
    const baseChart = createChart(baseContainer, {
      ...layout,
      crosshair: {
        horzLine: {
          color: c.textColor,
          labelBackgroundColor: c.crosshairLabelBg,
          labelVisible: false,
          style: 3,
          width: 1,
        },
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: c.textColor,
          labelBackgroundColor: c.crosshairLabelBg,
          labelVisible: false,
          style: 3,
          width: 1,
        },
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
    });

    // ── Colored chart ── passive overlay; no events, no crosshair
    const coloredChart = createChart(coloredContainer, {
      ...layout,
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    });

    // Base series: transparent line that anchors the crosshair magnet.
    // Becomes the muted gray line on hover (so the right portion shows gray).
    const baseSeries = baseChart.addSeries(AreaSeries, {
      bottomColor: "transparent",
      crosshairMarkerBackgroundColor: c.lineColor,
      crosshairMarkerBorderColor: c.crosshairMarkerBorderColor,
      crosshairMarkerRadius: 5,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      lineColor: "transparent",
      lineWidth: 2,
      priceFormat: { minMove: 0.01, precision: 2, type: "price" },
      priceLineVisible: false,
      topColor: "transparent",
    });

    // Colored series: always holds the full dataset; clip-path does the splitting.
    const coloredSeries = coloredChart.addSeries(AreaSeries, {
      bottomColor: c.areaBottomColor,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      lineColor: c.lineColor,
      lineWidth: 2,
      priceFormat: { minMove: 0.01, precision: 2, type: "price" },
      priceLineVisible: false,
      topColor: c.areaTopColor,
    });

    baseChartRef.current = baseChart;
    baseSeriesRef.current = baseSeries;
    coloredChartRef.current = coloredChart;
    coloredSeriesRef.current = coloredSeries;

    // Keep the colored chart's visible range in sync with the base chart
    // so scroll/zoom on the base chart is mirrored in the overlay.
    baseChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        coloredChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    // ── Crosshair handler ── O(1): just a style property write per frame
    baseChart.subscribeCrosshairMove((param) => {
      const notify = onCrosshairHoverRef.current;
      const coloredEl = coloredContainerRef.current;

      if (!param.time || !param.point || !coloredEl) {
        if (isHoveringRef.current) {
          isHoveringRef.current = false;
          if (coloredEl) {
            coloredEl.style.clipPath = "";
          }
          // Restore base series line to invisible.
          baseSeries.applyOptions({ lineColor: "transparent" });
        }
        if (notify) {
          notify(null);
        }
        return;
      }

      // First hover event — make the base series show as muted gray.
      if (!isHoveringRef.current) {
        isHoveringRef.current = true;
        baseSeries.applyOptions({
          lineColor:
            colorsRef.current?.mutedLineColor ?? "rgba(120,120,130,0.45)",
        });
      }

      // Clip the colored overlay to everything left of the cursor.
      // param.point.x is in chart-pane pixels; coloredEl.clientWidth is the container width.
      const rightPct = Math.max(
        0,
        Math.min(100, (1 - param.point.x / coloredEl.clientWidth) * 100)
      );
      coloredEl.style.clipPath = `inset(0 ${rightPct.toFixed(2)}% 0 0)`;

      const val = param.seriesData.get(baseSeries);
      const price = val && "value" in val ? (val.value as number) : undefined;
      const ts = param.time as number;

      if (notify && price !== undefined) {
        notify({
          price,
          timeLabel: formatChartTimeLabel(ts, periodRef.current),
        });
      }
    });

    return () => {
      baseChart.remove();
      coloredChart.remove();
      baseChartRef.current = null;
      baseSeriesRef.current = null;
      coloredChartRef.current = null;
      coloredSeriesRef.current = null;
    };
    // Only recreate when the container mounts/unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Theme changes ────────────────────────────────────────────────

  useEffect(() => {
    const bc = baseChartRef.current;
    const bs = baseSeriesRef.current;
    const cc = coloredChartRef.current;
    const cs = coloredSeriesRef.current;
    if (!bc || !bs || !cc || !cs) {
      return;
    }
    applyTheme(bc, bs, cc, cs);
  }, [applyTheme]);

  // ── Data changes ─────────────────────────────────────────────────

  useEffect(() => {
    const bs = baseSeriesRef.current;
    const cs = coloredSeriesRef.current;
    const bc = baseChartRef.current;
    const cc = coloredChartRef.current;
    if (!bs || !cs || !bc || !cc) {
      return;
    }

    const formatted = data.map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    bs.setData(formatted);
    cs.setData(formatted);
    bc.timeScale().fitContent();
    // Colored chart syncs via subscribeVisibleLogicalRangeChange, but also call
    // fitContent directly so both start from the same initial range.
    cc.timeScale().fitContent();

    // Reset any active hover state.
    isHoveringRef.current = false;
    if (coloredContainerRef.current) {
      coloredContainerRef.current.style.clipPath = "";
    }
    bs.applyOptions({ lineColor: "transparent" });
  }, [data]);

  // ── Height changes ───────────────────────────────────────────────

  useEffect(() => {
    const bc = baseChartRef.current;
    const cc = coloredChartRef.current;
    if (!bc || !cc) {
      return;
    }
    bc.applyOptions({ height });
    cc.applyOptions({ height });
  }, [height]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {/*
       * Outer wrapper sets the explicit pixel height so both absolutely-positioned
       * chart containers fill the right area. autoSize on each chart then handles
       * responsive width changes.
       */}
      <div
        className={cn("relative min-h-0 w-full min-w-0", chartClassName)}
        style={{ height }}
      >
        {/* Base chart: event layer, muted line on hover, crosshair marker */}
        <div ref={baseContainerRef} className="absolute inset-0" />
        {/* Colored chart: visual overlay, clip-path applied on hover */}
        <div
          ref={coloredContainerRef}
          className="pointer-events-none absolute inset-0"
        />
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
