// Canvas-based scrubbing area chart. Replaces the dual-recharts + clip-path
// hack with a single <canvas>. Monotone cubic spline math ported from
// benjitaylor/liveline (MIT). No streaming, no animation — historical only.
//
// Scrub interpolation: the cursor tracks the mouse pixel exactly, and the dot
// is placed on the spline at that exact x by evaluating the bezier segment
// the cursor falls inside. The headline value is recovered by inverting the
// canvas y → value transform, so the headline and dot always match.

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

export interface CanvasChartPoint {
  time: number;
  value: number;
}

export interface CanvasHoverInfo {
  time: number;
  value: number;
}

interface Padding {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface BalanceChartCanvasProps {
  ariaLabel?: string;
  baseColor?: string;
  colorVar?: string;
  lineWidth?: number;
  onHoverChange?: (info: CanvasHoverInfo | null) => void;
  padding?: Partial<Padding>;
  points: readonly CanvasChartPoint[];
}

const DEFAULT_PADDING: Padding = { bottom: 1, left: 1, right: 1, top: 6 };

function lastOf<T>(arr: readonly T[]): T {
  const v = arr.at(-1);
  if (v === undefined) {
    throw new Error("lastOf called on empty array");
  }
  return v;
}

function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw || fallback;
}

// Append/replace alpha on any CSS color string (oklch/lch/hsl/rgb/color()).
// Form: "oklch(L C H)" → "oklch(L C H / 0.55)".
function withAlpha(color: string, alpha: number): string {
  if (color.includes("/")) {
    return color.replace(/\/[^)]+\)/, `/ ${alpha})`);
  }
  return color.replace(/\)\s*$/, ` / ${alpha})`);
}

// Float64Array reads return number | undefined under noUncheckedIndexedAccess,
// so coalesce on each access. Off-end reads can't happen given loop bounds.
function computeSlopes(
  pts: readonly [number, number][],
): { h: Float64Array; m: Float64Array } | null {
  const n = pts.length;
  const h = new Float64Array(n - 1);
  const delta = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!(a && b)) {
      return null;
    }
    const dx = b[0] - a[0];
    h[i] = dx;
    delta[i] = dx === 0 ? 0 : (b[1] - a[1]) / dx;
  }
  const m = new Float64Array(n);
  m[0] = delta[0] ?? 0;
  m[n - 1] = delta[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i += 1) {
    const dPrev = delta[i - 1] ?? 0;
    const dCur = delta[i] ?? 0;
    m[i] = dPrev * dCur <= 0 ? 0 : (dPrev + dCur) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const dCur = delta[i] ?? 0;
    if (dCur === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = (m[i] ?? 0) / dCur;
    const beta = (m[i + 1] ?? 0) / dCur;
    const s2 = alpha * alpha + beta * beta;
    if (s2 > 9) {
      const s = 3 / Math.sqrt(s2);
      m[i] = s * alpha * dCur;
      m[i + 1] = s * beta * dCur;
    }
  }
  return { h, m };
}

function minSplineY(pts: readonly [number, number][]): number {
  const [first] = pts;
  let min = first ? first[1] : 0;
  for (const p of pts) {
    const [, py] = p;
    if (py < min) {
      min = py;
    }
  }
  return min;
}

function emitBeziers(
  ctx: CanvasRenderingContext2D,
  pts: readonly [number, number][],
  slopes: { h: Float64Array; m: Float64Array },
): void {
  const n = pts.length;
  const { h, m } = slopes;
  for (let i = 0; i < n - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!(a && b)) {
      return;
    }
    const hi = h[i] ?? 0;
    const mi = m[i] ?? 0;
    const mi1 = m[i + 1] ?? 0;
    ctx.bezierCurveTo(
      a[0] + hi / 3,
      a[1] + (mi * hi) / 3,
      b[0] - hi / 3,
      b[1] - (mi1 * hi) / 3,
      b[0],
      b[1],
    );
  }
}

function appendCurve(
  ctx: CanvasRenderingContext2D,
  pts: readonly [number, number][],
  slopes: { h: Float64Array; m: Float64Array } | null,
): void {
  const n = pts.length;
  if (n < 2) {
    return;
  }
  const [, p1] = pts;
  if (!p1) {
    return;
  }
  if (n === 2 || !slopes) {
    ctx.lineTo(p1[0], p1[1]);
    return;
  }
  emitBeziers(ctx, pts, slopes);
}

// Bracket search: find the segment i where pts[i].x <= cursorX < pts[i+1].x.
function findBracket(pts: readonly [number, number][], cursorX: number): number {
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const pm = pts[mid];
    if (!pm) {
      break;
    }
    if (pm[0] <= cursorX) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// Evaluate the monotone-cubic segment at exact cursorX. Returns the y in
// screen space and the segment-local parameter t ∈ [0, 1].
function evalSegmentY(
  pts: readonly [number, number][],
  slopes: { h: Float64Array; m: Float64Array },
  cursorX: number,
): { idx: number; t: number; y: number } | null {
  if (pts.length < 2) {
    return null;
  }
  const [first] = pts;
  const last = lastOf(pts);
  if (!first) {
    return null;
  }
  if (cursorX <= first[0]) {
    return { idx: 0, t: 0, y: first[1] };
  }
  if (cursorX >= last[0]) {
    return { idx: pts.length - 2, t: 1, y: last[1] };
  }
  const idx = findBracket(pts, cursorX);
  const a = pts[idx];
  const b = pts[idx + 1];
  if (!(a && b)) {
    return null;
  }
  const hi = slopes.h[idx] ?? 0;
  if (hi === 0) {
    return { idx, t: 0, y: a[1] };
  }
  const t = (cursorX - a[0]) / hi;
  const mA = slopes.m[idx] ?? 0;
  const mB = slopes.m[idx + 1] ?? 0;
  const omt = 1 - t;
  // y(t) = a.y * (1-t)^2 (1+2t) + b.y * t^2 (3-2t)
  //      + mA * h * (1-t)^2 t  − mB * h * (1-t) t^2
  const y =
    a[1] * omt * omt * (1 + 2 * t) +
    b[1] * t * t * (3 - 2 * t) +
    mA * hi * omt * omt * t -
    mB * hi * omt * t * t;
  return { idx, t, y };
}

interface DrawOptions {
  baseColor: string;
  color: string;
  cursorX: number | null;
  lineWidth: number;
  pad: Padding;
}

function drawChart(
  canvas: HTMLCanvasElement,
  points: readonly CanvasChartPoint[],
  opts: DrawOptions,
): CanvasHoverInfo | null {
  const ctx = canvas.getContext("2d", { colorSpace: "display-p3" });
  if (!ctx) {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) {
    return null;
  }
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const [first] = points;
  if (points.length < 2 || !first) {
    return null;
  }

  const { baseColor, color, cursorX, lineWidth, pad } = opts;
  const minT = first.time;
  const last = lastOf(points);
  const maxT = last.time;
  const tSpan = maxT - minT || 1;

  let minV = first.value;
  let maxV = first.value;
  for (const p of points) {
    if (p.value < minV) {
      minV = p.value;
    }
    if (p.value > maxV) {
      maxV = p.value;
    }
  }
  const vSpan = maxV - minV || Math.max(1, Math.abs(maxV));
  const vPad = vSpan * 0.1;
  const yLo = minV - vPad;
  const yHi = maxV + vPad;
  const yRange = yHi - yLo || 1;

  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const toX = (t: number): number => pad.left + ((t - minT) / tSpan) * chartW;
  const toY = (v: number): number => pad.top + (1 - (v - yLo) / yRange) * chartH;
  const invToY = (y: number): number => yLo + (1 - (y - pad.top) / chartH) * yRange;

  const pts: [number, number][] = points.map((p) => [toX(p.time), toY(p.value)]);
  const [firstPt] = pts;
  const lastPt = lastOf(pts);
  if (!firstPt) {
    return null;
  }
  const slopes = computeSlopes(pts);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Base stroke (gray, full extent).
  ctx.beginPath();
  ctx.moveTo(firstPt[0], firstPt[1]);
  appendCurve(ctx, pts, slopes);
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Colored portion clipped to cursor (or full chart if no cursor).
  const clipRight = cursorX ?? w;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, clipRight, h);
  ctx.clip();

  // Match recharts objectBoundingBox gradient: span the fill polygon (top of
  // line → baseline), not the chart rect. Keeps top alpha right at the line.
  const minPy = minSplineY(pts);
  const grad = ctx.createLinearGradient(0, minPy, 0, h - pad.bottom);
  grad.addColorStop(0, withAlpha(color, 0.35));
  grad.addColorStop(1, withAlpha(color, 0));
  ctx.beginPath();
  ctx.moveTo(firstPt[0], h - pad.bottom);
  ctx.lineTo(firstPt[0], firstPt[1]);
  appendCurve(ctx, pts, slopes);
  ctx.lineTo(lastPt[0], h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(firstPt[0], firstPt[1]);
  appendCurve(ctx, pts, slopes);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();

  if (cursorX === null || !slopes) {
    return null;
  }
  return drawCursorAndHover({
    bottomY: h - pad.bottom,
    color,
    ctx,
    cursorX,
    invToY,
    points,
    pts,
    slopes,
    topY: pad.top,
  });
}

interface CursorArgs {
  bottomY: number;
  color: string;
  ctx: CanvasRenderingContext2D;
  cursorX: number;
  invToY: (y: number) => number;
  points: readonly CanvasChartPoint[];
  pts: readonly [number, number][];
  slopes: { h: Float64Array; m: Float64Array };
  topY: number;
}

function drawCursorAndHover(args: CursorArgs): CanvasHoverInfo | null {
  const { bottomY, color, ctx, cursorX, invToY, points, pts, slopes, topY } = args;
  const hit = evalSegmentY(pts, slopes, cursorX);
  if (!hit) {
    return null;
  }
  const a = points[hit.idx];
  const bPt = points[hit.idx + 1];
  if (!(a && bPt)) {
    return null;
  }
  ctx.strokeStyle = withAlpha(color, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cursorX, topY);
  ctx.lineTo(cursorX, bottomY);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cursorX, hit.y, 4, 0, Math.PI * 2);
  ctx.fill();
  return {
    time: a.time + hit.t * (bPt.time - a.time),
    value: invToY(hit.y),
  };
}

export function BalanceChartCanvas({
  ariaLabel,
  baseColor = "rgba(120,120,130,0.45)",
  colorVar = "--color-green-550",
  lineWidth = 2,
  onHoverChange,
  padding,
  points,
}: BalanceChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorXRef = useRef<number | null>(null);
  const colorRef = useRef<string>("rgb(0,170,90)");
  const onHoverRef = useRef(onHoverChange);
  onHoverRef.current = onHoverChange;

  const pad = useMemo<Padding>(
    () => ({
      bottom: padding?.bottom ?? DEFAULT_PADDING.bottom,
      left: padding?.left ?? DEFAULT_PADDING.left,
      right: padding?.right ?? DEFAULT_PADDING.right,
      top: padding?.top ?? DEFAULT_PADDING.top,
    }),
    [padding?.bottom, padding?.left, padding?.right, padding?.top],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const hover = drawChart(canvas, points, {
      baseColor,
      color: colorRef.current,
      cursorX: cursorXRef.current,
      lineWidth,
      pad,
    });
    onHoverRef.current?.(hover);
  }, [points, baseColor, lineWidth, pad]);

  useLayoutEffect(() => {
    colorRef.current = resolveCssVarColor(colorVar, "rgb(0,170,90)");
    redraw();
  }, [colorVar, redraw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(redraw);
    });
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [redraw]);

  const handleMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      cursorXRef.current = Math.max(0, Math.min(rect.width, x));
      redraw();
    },
    [redraw],
  );

  const handleLeave = useCallback(() => {
    cursorXRef.current = null;
    redraw();
  }, [redraw]);

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
      className="relative h-full w-full"
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      role="img"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
