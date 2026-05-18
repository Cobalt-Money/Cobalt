import { cn } from "@cobalt-web/ui/lib/utils";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface RulerPickerProps {
  min: number;
  max: number;
  value: number;
  /** Snap step in value units. Default 0.01. */
  step?: number;
  /** Pixels per integer unit on the rail. Default 56. */
  pxPerUnit?: number;
  onValueChange: (next: number) => void;
  className?: string;
}

/**
 * Horizontal scrub-rule number picker. The center of the visible area
 * represents the current value — user drags / wheels the rail; numbers slide
 * past a fixed center indicator. Integer labels render on the rail with major
 * ticks; sub-integer minor ticks divide each unit into 10. Edge labels fade so
 * the center reads as the selection.
 */
// eslint-disable-next-line complexity
export function RulerPicker({
  min,
  max,
  value,
  step = 0.01,
  pxPerUnit = 56,
  onValueChange,
  className,
}: RulerPickerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  /**
   * True while we're scrolling the rail programmatically to reflect an
   * external `value` change. Blocks the scroll listener from feeding that
   * scroll back into onValueChange — avoids a feedback loop.
   */
  const settingFromValue = useRef(false);

  // Measure wrapper width so we can set leading/trailing padding to half the
  // wrapper — keeps the center indicator over the value.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWrapperWidth(w);
    });
    ro.observe(el);
    setWrapperWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const ints = useMemo(() => {
    const out: number[] = [];
    for (let n = Math.floor(min); n <= Math.ceil(max); n += 1) {
      out.push(n);
    }
    return out;
  }, [min, max]);

  const railWidth = (max - min) * pxPerUnit;
  const sidePad = wrapperWidth / 2;

  // Drive the scroller from external value changes.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || wrapperWidth === 0) {
      return;
    }
    const clamped = Math.max(min, Math.min(max, value));
    const target = (clamped - min) * pxPerUnit;
    if (Math.abs(el.scrollLeft - target) > 1) {
      settingFromValue.current = true;
      el.scrollLeft = target;
      // Release the lock after the resulting scroll event has fired.
      window.requestAnimationFrame(() => {
        settingFromValue.current = false;
      });
    }
  }, [value, min, max, pxPerUnit, wrapperWidth]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || settingFromValue.current) {
      return;
    }
    const raw = min + el.scrollLeft / pxPerUnit;
    const snapped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));
    if (Math.abs(clamped - value) >= step / 2) {
      onValueChange(Number(clamped.toFixed(4)));
    }
  };

  // Mouse + touch drag-to-scrub so users don't need the (hidden) scrollbar.
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.setPointerCapture(e.pointerId);
    dragRef.current = { startScroll: el.scrollLeft, startX: e.clientX };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!(drag && el)) {
      return;
    }
    el.scrollLeft = drag.startScroll - (e.clientX - drag.startX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    dragRef.current = null;
  };

  return (
    <div className={cn("relative w-full py-2", className)} ref={wrapperRef}>
      {/* Center indicator */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-primary/30"
      />
      <div
        className="scrollbar-none cursor-grab touch-pan-x overflow-x-auto active:cursor-grabbing [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onScroll={handleScroll}
        ref={scrollerRef}
      >
        <div
          className="relative h-12"
          style={{ paddingLeft: sidePad, paddingRight: sidePad, width: railWidth + wrapperWidth }}
        >
          {/* Major + minor tick rows */}
          <div className="absolute inset-x-0 top-0 h-2" style={{ left: sidePad, width: railWidth }}>
            {ints.map((n) => (
              <div
                className="absolute top-0 h-2 w-px bg-foreground/30"
                key={`top-${n}`}
                style={{ left: (n - min) * pxPerUnit }}
              />
            ))}
            {/* Minor ticks every 0.1 unit */}
            {ints.flatMap((n) =>
              Array.from({ length: 9 }, (_, i) => {
                const off = (n - min) * pxPerUnit + ((i + 1) * pxPerUnit) / 10;
                if (off < 0 || off > railWidth) {
                  return null;
                }
                return (
                  <div
                    className="absolute top-0 h-1 w-px bg-foreground/15"
                    key={`top-min-${n}-${i}`}
                    style={{ left: off }}
                  />
                );
              }),
            )}
          </div>

          {/* Integer labels */}
          <div className="absolute top-3 h-6" style={{ left: sidePad, width: railWidth }}>
            {ints.map((n) => {
              const offset = (n - min) * pxPerUnit;
              const distFromValue = Math.abs(n - value);
              // Fade with distance from center value.
              const isCenter = distFromValue < 0.5;
              const opacity = isCenter ? 1 : Math.max(0.25, 1 - distFromValue / 4);
              return (
                <span
                  className={cn(
                    "absolute top-0 -translate-x-1/2 select-none text-sm tabular-nums transition-colors",
                    isCenter ? "font-semibold text-primary" : "text-foreground",
                  )}
                  key={`label-${n}`}
                  style={{ left: offset, opacity }}
                >
                  {n}
                </span>
              );
            })}
          </div>

          {/* Bottom tick row mirrors top */}
          <div
            className="absolute inset-x-0 bottom-0 h-2"
            style={{ left: sidePad, width: railWidth }}
          >
            {ints.map((n) => (
              <div
                className="absolute bottom-0 h-2 w-px bg-foreground/30"
                key={`bot-${n}`}
                style={{ left: (n - min) * pxPerUnit }}
              />
            ))}
            {ints.flatMap((n) =>
              Array.from({ length: 9 }, (_, i) => {
                const off = (n - min) * pxPerUnit + ((i + 1) * pxPerUnit) / 10;
                if (off < 0 || off > railWidth) {
                  return null;
                }
                return (
                  <div
                    className="absolute bottom-0 h-1 w-px bg-foreground/15"
                    key={`bot-min-${n}-${i}`}
                    style={{ left: off }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
