import { areIntervalsOverlapping, parseISO } from "date-fns";

import { EventBlock } from "@/components/event-block";
import { getEventBlockStyle } from "@/components/helpers";
import type { IEvent } from "@/components/interfaces";

interface RenderGroupedEventsProps {
  groupedEvents: IEvent[][];
  day: Date;
}

export function RenderGroupedEvents({
  groupedEvents,
  day,
}: RenderGroupedEventsProps) {
  return groupedEvents.map((group, groupIndex) =>
    group.map((event) => {
      let style = getEventBlockStyle(
        event,
        day,
        groupIndex,
        groupedEvents.length
      );
      const hasOverlap = groupedEvents.some(
        (otherGroup, otherIndex) =>
          otherIndex !== groupIndex &&
          otherGroup.some((otherEvent) =>
            areIntervalsOverlapping(
              {
                end: parseISO(event.endDate),
                start: parseISO(event.startDate),
              },
              {
                end: parseISO(otherEvent.endDate),
                start: parseISO(otherEvent.startDate),
              }
            )
          )
      );

      if (!hasOverlap) {
        style = { ...style, left: "0%", width: "100%" };
      }

      return (
        <div key={event.id} className="absolute p-1" style={style}>
          <EventBlock event={event} />
        </div>
      );
    })
  );
}
