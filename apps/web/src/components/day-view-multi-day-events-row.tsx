import {
  differenceInDays,
  endOfDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";

import type { IEvent } from "@/components/interfaces";
import { MonthEventBadge } from "@/components/month-event-badge";

interface IProps {
  selectedDate: Date;
  multiDayEvents: IEvent[];
}

export function DayViewMultiDayEventsRow({
  selectedDate,
  multiDayEvents,
}: IProps) {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  const multiDayEventsInDay = multiDayEvents
    .filter((event) => {
      const eventStart = parseISO(event.startDate);
      const eventEnd = parseISO(event.endDate);

      return (
        isWithinInterval(dayStart, { end: eventEnd, start: eventStart }) ||
        isWithinInterval(dayEnd, { end: eventEnd, start: eventStart }) ||
        (eventStart <= dayStart && eventEnd >= dayEnd)
      );
    })
    .toSorted((a, b) => {
      const durationA = differenceInDays(
        parseISO(a.endDate),
        parseISO(a.startDate)
      );
      const durationB = differenceInDays(
        parseISO(b.endDate),
        parseISO(b.startDate)
      );
      return durationB - durationA;
    });

  if (multiDayEventsInDay.length === 0) {
    return null;
  }

  return (
    <div className="flex border-b">
      <div className="w-18" />
      <div className="flex flex-1 flex-col gap-1 border-l py-1">
        {multiDayEventsInDay.map((event) => {
          const eventStart = startOfDay(parseISO(event.startDate));
          const eventEnd = startOfDay(parseISO(event.endDate));
          const currentDate = startOfDay(selectedDate);

          const eventTotalDays = differenceInDays(eventEnd, eventStart) + 1;
          const eventCurrentDay = differenceInDays(currentDate, eventStart) + 1;

          return (
            <MonthEventBadge
              key={event.id}
              event={event}
              cellDate={selectedDate}
              eventCurrentDay={eventCurrentDay}
              eventTotalDays={eventTotalDays}
            />
          );
        })}
      </div>
    </div>
  );
}
