"use client";

import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DayPicker as ReactDayPicker, getDefaultClassNames } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";

export type DayPickerProps = React.ComponentProps<typeof ReactDayPicker>;

function DayPicker({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <ReactDayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_next,
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_previous,
        ),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),

        chevron: cn("fill-muted-foreground", defaultClassNames.chevron),
        day: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected])]:bg-accent",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
          defaultClassNames.day,
        ),

        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
          defaultClassNames.day_button,
        ),
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",

        month: cn("flex flex-col gap-4", defaultClassNames.month),
        month_caption: cn(
          "relative flex h-7 items-center justify-center",
          defaultClassNames.month_caption,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),

        nav: cn("absolute inset-x-0 top-0 flex w-full justify-between z-10", defaultClassNames.nav),
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",

        range_end: "day-range-end",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        root: cn("w-fit", defaultClassNames.root),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "text-red-600 font-bold",
        week: cn("flex w-full mt-2", defaultClassNames.week),
        weekday: cn(
          "text-muted-foreground w-9 font-normal text-[0.8rem]",
          defaultClassNames.weekday,
        ),

        weekdays: cn("flex", defaultClassNames.weekdays),

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />;
          }
          return <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />;
        },
      }}
      {...props}
    />
  );
}
DayPicker.displayName = "DayPicker";

export { DayPicker };
