import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cobalt-web/ui/components/popover";
import { Slider } from "@cobalt-web/ui/components/slider";
import { useState } from "react";

export type AmountFilterType = "all" | "income" | "expense";

export interface AmountFilterValue {
  type: AmountFilterType;
  min: number | undefined;
  max: number | undefined;
}

const TYPE_LABELS: Record<AmountFilterType, string> = {
  all: "All",
  expense: "Expense",
  income: "Income",
};

const TYPE_OPTIONS: readonly AmountFilterType[] = ["all", "income", "expense"];

const SLIDER_MAX = 10_000;
const SLIDER_STEP = 10;

const formatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatBound(value: number): string {
  if (value >= SLIDER_MAX) {
    return `${formatter.format(SLIDER_MAX)}+`;
  }
  return formatter.format(value);
}

export function AmountFilter({
  value,
  onChange,
}: {
  value: AmountFilterValue;
  onChange: (next: AmountFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const { type, min, max } = value;
  const sliderMin = typeof min === "number" ? min : 0;
  const sliderMax = typeof max === "number" ? max : SLIDER_MAX;
  const hasRange = sliderMin > 0 || sliderMax < SLIDER_MAX;
  const hasType = type !== "all";
  const isActive = hasType || hasRange;

  let triggerLabel = "Amount";
  if (isActive) {
    const parts: string[] = [];
    if (hasType) {
      parts.push(TYPE_LABELS[type]);
    }
    if (hasRange) {
      parts.push(`${formatBound(sliderMin)}–${formatBound(sliderMax)}`);
    }
    triggerLabel = `Amount: ${parts.join(" · ")}`;
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <CobaltToggle
            pressed={isActive}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center gap-1">
          {TYPE_OPTIONS.map((t) => (
            <CobaltToggle
              className="flex-1"
              key={t}
              onPressedChange={(pressed) => {
                if (pressed) {
                  onChange({ max, min, type: t });
                }
              }}
              pressed={type === t}
              size="sm"
              type="button"
              variant="outline"
            >
              {TYPE_LABELS[t]}
            </CobaltToggle>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{formatBound(sliderMin)}</span>
            <span>{formatBound(sliderMax)}</span>
          </div>
          <Slider
            max={SLIDER_MAX}
            min={0}
            onValueChange={(values) => {
              if (!Array.isArray(values) || values.length < 2) {
                return;
              }
              const [nextMin, nextMax] = values as [number, number];
              onChange({
                max: nextMax < SLIDER_MAX ? nextMax : undefined,
                min: nextMin > 0 ? nextMin : undefined,
                type,
              });
            }}
            step={SLIDER_STEP}
            value={[sliderMin, sliderMax]}
          />
        </div>
        {isActive ? (
          <button
            className="self-start text-muted-foreground text-xs hover:text-foreground"
            onClick={() => {
              onChange({ max: undefined, min: undefined, type: "all" });
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
