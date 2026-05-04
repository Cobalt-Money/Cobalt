import {
  addDays,
  differenceInDays,
  endOfWeek,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { useMemo } from "react";

import type { IEvent } from "@/components/interfaces";
import { MonthEventBadge } from "@/components/month-event-badge";

interface IProps {
  selectedDate: Date;
  multiDayEvents: IEvent[];
}

export function WeekViewMultiDayEventsRow({ selectedDate, multiDayEvents }: IProps) {
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const processedEvents = useMemo(
    () =>
      multiDayEvents
        .map((event) => {
          const start = parseISO(event.startDate);
          const end = parseISO(event.endDate);
          const adjustedStart = isBefore(start, weekStart) ? weekStart : start;
          const adjustedEnd = isAfter(end, weekEnd) ? weekEnd : end;
          const startIndex = differenceInDays(adjustedStart, weekStart);
          const endIndex = differenceInDays(adjustedEnd, weekStart);

          return {
            ...event,
            adjustedEnd,
            adjustedStart,
            endIndex,
            startIndex,
          };
        })
        .sort((a, b) => {
          const startDiff = a.adjustedStart.getTime() - b.adjustedStart.getTime();
          if (startDiff !== 0) {
            return startDiff;
          }
          return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
        }),
    [multiDayEvents, weekStart, weekEnd],
  );

  const eventRows = useMemo(() => {
    const rows: (typeof processedEvents)[] = [];

    for (const event of processedEvents) {
      let rowIndex = rows.findIndex((row) =>
        row.every((e) => e.endIndex < event.startIndex || e.startIndex > event.endIndex),
      );

      if (rowIndex === -1) {
        rowIndex = rows.length;
        rows.push([]);
      }

      rows[rowIndex].push(event);
    }

    return rows;
  }, [processedEvents]);

  const hasEventsInWeek = useMemo(
    () =>
      multiDayEvents.some((event) => {
        const start = parseISO(event.startDate);
        const end = parseISO(event.endDate);

        return (
          // Event starts within the week
          (start >= weekStart && start <= weekEnd) ||
          // Event ends within the week
          (end >= weekStart && end <= weekEnd) ||
          // Event spans the entire week
          (start <= weekStart && end >= weekEnd)
        );
      }),
    [multiDayEvents, weekStart, weekEnd],
  );

  if (!hasEventsInWeek) {
    return null;
  }

  return (
    <div className="overflow-hidden flex">
      <div className="w-18 border-b" />
      <div className="grid flex-1 grid-cols-7 divide-x border-b border-l">
        {weekDays.map((day, dayIndex) => (
          <div key={day.toISOString()} className="flex h-full flex-col gap-1 py-1">
            {eventRows.map((row) => {
              const event = row.find((e) => e.startIndex <= dayIndex && e.endIndex >= dayIndex);

              if (!event) {
                return (
                  <div
                    key={["week-md-spacer", day.toISOString(), ...row.map((e) => e.id)].join("-")}
                    className="h-6.5"
                  />
                );
              }

              let position: "first" | "middle" | "last" | "none" = "none";

              if (dayIndex === event.startIndex && dayIndex === event.endIndex) {
                position = "none";
              } else if (dayIndex === event.startIndex) {
                position = "first";
              } else if (dayIndex === event.endIndex) {
                position = "last";
              } else {
                position = "middle";
              }

              return (
                <MonthEventBadge
                  key={`${event.id}-${dayIndex}`}
                  event={event}
                  cellDate={startOfDay(day)}
                  position={position}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
