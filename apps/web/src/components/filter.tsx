import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import {
  ArrowReloadHorizontalIcon,
  FilterIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useCalendar } from "@/components/calendar-context";
import type { TEventColor } from "@/components/types";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";

export default function FilterEvents() {
  const { selectedColors, filterEventsBySelectedColors, clearFilter } =
    useCalendar();

  const colors: TEventColor[] = [
    "blue",
    "green",
    "red",
    "yellow",
    "purple",
    "orange",
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Toggle variant="outline" className="cursor-pointer w-fit" />}
      >
        <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {colors.map((color) => (
          <DropdownMenuItem
            key={color}
            className="flex items-center gap-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              filterEventsBySelectedColors(color);
            }}
          >
            <div
              className={`size-3.5 rounded-full bg-${color}-600 dark:bg-${color}-700`}
            />
            <span className="capitalize flex justify-center items-center gap-2">
              {color}
              <span>
                {selectedColors.includes(color) && (
                  <span className="text-blue-500">
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={16}
                      strokeWidth={2}
                    />
                  </span>
                )}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <Separator className="my-2" />
        <DropdownMenuItem
          disabled={selectedColors.length === 0}
          className="flex gap-2 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            clearFilter();
          }}
        >
          <HugeiconsIcon
            icon={ArrowReloadHorizontalIcon}
            size={14}
            strokeWidth={2}
          />
          Clear Filter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
