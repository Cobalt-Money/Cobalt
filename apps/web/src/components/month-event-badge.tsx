import { cn } from "@cobalt-web/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { endOfDay, isSameDay, parseISO, startOfDay } from "date-fns";

import { useCalendar } from "@/components/calendar-context";
import { DraggableEvent } from "@/components/draggable-event";
import { EventBullet } from "@/components/event-bullet";
import { formatTime } from "@/components/helpers";
import type { IEvent } from "@/components/interfaces";

const eventBadgeVariants = cva(
  "flex h-6.5 w-full cursor-grab select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs",
  {
    defaultVariants: {
      color: "blue-dot",
    },
    variants: {
      color: {
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        "blue-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-blue-600 dark:[&_svg]:fill-blue-500",
        green:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
        "green-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-green-600 dark:[&_svg]:fill-green-500",
        orange:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
        "orange-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-orange-600 dark:[&_svg]:fill-orange-500",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
        "purple-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-purple-600 dark:[&_svg]:fill-purple-500",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
        "red-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-red-600 dark:[&_svg]:fill-red-500",
        yellow:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        "yellow-dot":
          "bg-bg-secondary text-t-primary [&_svg]:fill-yellow-600 dark:[&_svg]:fill-yellow-500",
      },
      multiDayPosition: {
        first: "relative z-10 mr-0 rounded-r-none border-r-0 [&>span]:mr-2.5",
        last: "ml-0 rounded-l-none border-l-0",
        middle:
          "relative z-10 mx-0 w-[calc(100%_+_1px)] rounded-none border-x-0",
        none: "",
      },
    },
  }
);

type MultiDayPosition = NonNullable<
  VariantProps<typeof eventBadgeVariants>["multiDayPosition"]
>;

interface IProps extends Omit<
  VariantProps<typeof eventBadgeVariants>,
  "color" | "multiDayPosition"
> {
  cellDate: Date;
  className?: string;
  event: IEvent;
  eventCurrentDay?: number;
  eventTotalDays?: number;
  position?: MultiDayPosition;
}

export function MonthEventBadge({
  event,
  cellDate,
  className,
  position: positionProp,
  eventCurrentDay,
  eventTotalDays,
}: IProps) {
  const { badgeVariant, use24HourFormat } = useCalendar();

  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const isMultiDay = !isSameDay(start, end);

  const color = (
    badgeVariant === "dot" ? `${event.color}-dot` : event.color
  ) as VariantProps<typeof eventBadgeVariants>["color"];

  let multiDayPosition: MultiDayPosition = "none";
  if (positionProp !== undefined) {
    multiDayPosition = positionProp;
  } else if (isMultiDay) {
    if (isSameDay(start, cellDate)) {
      multiDayPosition = "first";
    } else if (isSameDay(end, cellDate)) {
      multiDayPosition = "last";
    } else if (cellDate > startOfDay(start) && cellDate < endOfDay(end)) {
      multiDayPosition = "middle";
    }
  }

  const showDayProgress =
    eventCurrentDay !== undefined && eventTotalDays !== undefined;

  return (
    <DraggableEvent event={event}>
      <div
        className={cn(
          eventBadgeVariants({ className, color, multiDayPosition }),
          isMultiDay && multiDayPosition === "middle" && "justify-center"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {badgeVariant === "dot" ? <EventBullet color={event.color} /> : null}
          <span className="truncate font-medium">{event.title}</span>
          {showDayProgress ? (
            <span className="shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
              {eventCurrentDay}/{eventTotalDays}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">
          {formatTime(start, use24HourFormat)}
        </span>
      </div>
    </DraggableEvent>
  );
}
