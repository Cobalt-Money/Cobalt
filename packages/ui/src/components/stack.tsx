import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentProps } from "react";

type Gap = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

const gapMap: Record<Gap, string> = {
  0: "gap-0",
  0.5: "gap-0.5",
  1: "gap-1",
  1.5: "gap-1.5",
  2: "gap-2",
  2.5: "gap-2.5",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

const alignMap: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyMap: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

type StackProps = ComponentProps<"div"> & {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  inline?: boolean;
};

function HStack({
  className,
  gap = 2,
  align = "center",
  justify,
  wrap,
  inline,
  ...props
}: StackProps) {
  return (
    <div
      data-slot="hstack"
      className={cn(
        inline ? "inline-flex" : "flex",
        "flex-row",
        gapMap[gap],
        alignMap[align],
        justify && justifyMap[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}

function VStack({
  className,
  gap = 2,
  align,
  justify,
  wrap,
  inline,
  ...props
}: StackProps) {
  return (
    <div
      data-slot="vstack"
      className={cn(
        inline ? "inline-flex" : "flex",
        "flex-col",
        gapMap[gap],
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}

export { HStack, VStack };
export type { StackProps };
