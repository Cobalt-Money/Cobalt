"use client";

import { cn } from "@cobalt-web/ui/lib/utils";
import { addMinutes, differenceInMinutes, format, isAfter, isBefore, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Resizable } from "re-resizable";
import type { ResizeCallback } from "re-resizable";
import { useCallback, useMemo, useState } from "react";

import { useCalendar } from "@/components/calendar-context";
import type { IEvent } from "@/components/interfaces";

interface ResizableEventBlockProps {
  event: IEvent;
  children: React.ReactNode;
  className?: string;
}

const PIXELS_PER_HOUR = 96;
const MINUTES_PER_PIXEL = 60 / PIXELS_PER_HOUR;
const MIN_DURATION = 15; // in minutes

export function ResizableEvent({ event, children, className }: ResizableEventBlockProps) {
  const { updateEvent, use24HourFormat } = useCalendar();

  const [isResizing, setIsResizing] = useState(false);
  const [resizePreview, setResizePreview] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const start = useMemo(() => parseISO(event.startDate), [event.startDate]);
  const end = useMemo(() => parseISO(event.endDate), [event.endDate]);
  const durationInMinutes = useMemo(() => differenceInMinutes(end, start), [start, end]);

  const resizeBoundaries = useMemo(() => {
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    return { dayEnd, dayStart };
  }, [start]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResize: ResizeCallback = useCallback(
    (_e: MouseEvent | TouchEvent, direction: string, ref: HTMLElement) => {
      const newHeight = Number.parseInt(ref.style.height, 10);
      const newDuration = Math.max(MIN_DURATION, Math.round((newHeight + 8) * MINUTES_PER_PIXEL));
      const delta = newDuration - durationInMinutes;

      let newStart = start;
      let newEnd = end;

      if (direction.includes("top")) {
        newStart = addMinutes(start, -delta);
      } else if (direction.includes("bottom")) {
        newEnd = addMinutes(end, delta);
      }

      if (isBefore(newStart, resizeBoundaries.dayStart)) {
        newStart = resizeBoundaries.dayStart;
      }
      if (isAfter(newEnd, resizeBoundaries.dayEnd)) {
        newEnd = resizeBoundaries.dayEnd;
      }

      setResizePreview({
        end: format(newEnd, use24HourFormat ? "HH:mm" : "h:mm a"),
        start: format(newStart, use24HourFormat ? "HH:mm" : "h:mm a"),
      });

      updateEvent({
        ...event,
        endDate: newEnd.toISOString(),
        startDate: newStart.toISOString(),
      });
    },
    [start, end, durationInMinutes, resizeBoundaries, use24HourFormat, updateEvent, event],
  );

  const handleResizeStop = useCallback(() => {
    setIsResizing(false);
    setResizePreview(null);
  }, []);

  const resizeConfig = useMemo(
    () => ({
      className: cn("transition-all duration-200", isResizing && "z-50 shadow-lg"),
      enable: {
        bottom: true,
        bottomLeft: false,
        bottomRight: false,
        top: true,
        topLeft: false,
        topRight: false,
      },
      handleClasses: {
        bottom: "transition-colors rounded-sm",
        top: "transition-colors rounded-sm",
      },
      handleStyles: {
        bottom: {
          backgroundColor: "transparent",
          bottom: "-4px",
          cursor: "ns-resize",
          height: "8px",
        },
        top: {
          backgroundColor: "transparent",
          cursor: "ns-resize",
          height: "8px",
          top: "-4px",
        },
      },
      maxHeight: 1440,
      minHeight: 15,
      onResize: handleResize,
      onResizeStart: handleResizeStart,
      onResizeStop: handleResizeStop,
    }),
    [handleResizeStart, handleResize, handleResizeStop, isResizing],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("relative group", className)}
    >
      <Resizable {...resizeConfig}>{children}</Resizable>

      {isResizing && resizePreview && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap"
        >
          {resizePreview.start} - {resizePreview.end}
        </motion.div>
      )}
    </motion.div>
  );
}
