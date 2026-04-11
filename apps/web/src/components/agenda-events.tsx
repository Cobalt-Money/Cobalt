import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format, parseISO } from "date-fns";
import type { FC } from "react";

import { useCalendar } from "@/components/calendar-context";
import { EventBullet } from "@/components/event-bullet";
import {
  formatTime,
  getBgColor,
  getColorClass,
  getEventsForMonth,
  getFirstLetters,
  toCapitalize,
} from "@/components/helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const AgendaEvents: FC = () => {
  const {
    events,
    use24HourFormat,
    badgeVariant,
    agendaModeGroupBy,
    selectedDate,
  } = useCalendar();

  const monthEvents = getEventsForMonth(events, selectedDate);

  const agendaEvents = Object.groupBy(monthEvents, (event) =>
    agendaModeGroupBy === "date"
      ? format(parseISO(event.startDate), "yyyy-MM-dd")
      : event.color
  );

  const groupedAndSortedEvents = Object.entries(agendaEvents).toSorted(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );

  return (
    <Command className="py-4 h-[80vh] bg-transparent">
      <div className="mb-4 mx-4">
        <CommandInput placeholder="Type a command or search..." />
      </div>
      <CommandList className="max-h-max px-3 border-t">
        {groupedAndSortedEvents.map(([date, groupedEvents]) => {
          const groupList = groupedEvents ?? [];
          const headingColor = groupList[0]?.color;
          let heading: string;
          if (agendaModeGroupBy === "date") {
            heading = format(parseISO(date), "EEEE, MMMM d, yyyy");
          } else if (headingColor) {
            heading = toCapitalize(headingColor);
          } else {
            heading = "";
          }
          return (
            <CommandGroup key={date} heading={heading}>
              {groupList.map((event) => (
                <CommandItem
                  key={event.id}
                  className={cn(
                    "mb-2 p-4 border rounded-md data-[selected=true]:bg-bg transition-all data-[selected=true]:text-none hover:cursor-pointer",
                    {
                      [getColorClass(event.color)]: badgeVariant === "colored",
                      "hover:bg-zinc-200 dark:hover:bg-gray-900":
                        badgeVariant === "dot",
                      "hover:opacity-60": badgeVariant === "colored",
                    }
                  )}
                >
                  <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {badgeVariant === "dot" ? (
                        <EventBullet color={event.color} />
                      ) : (
                        <Avatar>
                          <AvatarImage src="" alt="@shadcn" />
                          <AvatarFallback className={getBgColor(event.color)}>
                            {getFirstLetters(event.title)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col">
                        <p
                          className={cn({
                            "font-medium": badgeVariant === "dot",
                            "text-foreground": badgeVariant === "dot",
                          })}
                        >
                          {event.title}
                        </p>
                        <p className="text-muted-foreground text-sm line-clamp-1 text-ellipsis md:text-clip w-1/3">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <div className="w-40 flex justify-center items-center gap-1">
                      {agendaModeGroupBy === "date" ? (
                        <>
                          <p className="text-sm">
                            {formatTime(event.startDate, use24HourFormat)}
                          </p>
                          <span className="text-muted-foreground">-</span>
                          <p className="text-sm">
                            {formatTime(event.endDate, use24HourFormat)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            {format(event.startDate, "MM/dd/yyyy")}
                          </p>
                          <span className="text-sm">at</span>
                          <p className="text-sm">
                            {formatTime(event.startDate, use24HourFormat)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        <CommandEmpty>No results found.</CommandEmpty>
      </CommandList>
    </Command>
  );
};
