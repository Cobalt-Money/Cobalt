import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type StatTone = "default" | "positive" | "negative" | "muted";

const toneMap: Record<StatTone, string> = {
  default: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  muted: "text-muted-foreground",
};

const valueSizeMap = {
  sm: "text-lg",
  default: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

type StatProps = ComponentProps<"div"> & {
  label?: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  tone?: StatTone;
  size?: keyof typeof valueSizeMap;
};

function Stat({
  label,
  value,
  delta,
  tone = "default",
  size = "default",
  className,
  ...props
}: StatProps) {
  return (
    <div
      data-slot="stat"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {label ? (
        <span className="text-xs text-muted-foreground">{label}</span>
      ) : null}
      <span
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          valueSizeMap[size],
          toneMap[tone],
        )}
      >
        {value}
      </span>
      {delta ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {delta}
        </span>
      ) : null}
    </div>
  );
}

function StatValue({
  className,
  tone = "default",
  size = "default",
  ...props
}: ComponentProps<"span"> & { tone?: StatTone; size?: keyof typeof valueSizeMap }) {
  return (
    <span
      data-slot="stat-value"
      className={cn(
        "font-semibold tabular-nums tracking-tight",
        valueSizeMap[size],
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Stat, StatValue };
export type { StatProps, StatTone };
