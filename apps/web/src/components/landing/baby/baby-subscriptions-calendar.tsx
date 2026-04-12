import { LogoCDN } from "@cobalt-web/ui/cobalt/logos/logo-cdn";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isToday,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";

import { SegmentedGauge } from "@/components/subscriptions/segmented-gauge";

const brandfetchClientId = "";

interface Subscription {
  id: number;
  name: string;
  domain: string;
  amount: number;
  colorClass: string;
  billingDay: number;
  billingCycle: "monthly" | "yearly";
  billingMonth?: number;
}

const SUBSCRIPTIONS: Subscription[] = [
  {
    amount: 15.99,
    billingCycle: "monthly",
    billingDay: 5,
    colorClass: "bg-red-500",
    domain: "netflix.com",
    id: 1,
    name: "Netflix",
  },
  {
    amount: 10.99,
    billingCycle: "monthly",
    billingDay: 12,
    colorClass: "bg-green-500",
    domain: "spotify.com",
    id: 2,
    name: "Spotify",
  },
  {
    amount: 10,
    billingCycle: "monthly",
    billingDay: 18,
    colorClass: "bg-zinc-700",
    domain: "github.com",
    id: 3,
    name: "GitHub Copilot",
  },
  {
    amount: 9.99,
    billingCycle: "monthly",
    billingDay: 22,
    colorClass: "bg-blue-400",
    domain: "icloud.com",
    id: 4,
    name: "iCloud+",
  },
  {
    amount: 54.99,
    billingCycle: "monthly",
    billingDay: 1,
    colorClass: "bg-red-700",
    domain: "adobe.com",
    id: 5,
    name: "Adobe CC",
  },
  {
    amount: 120,
    billingCycle: "monthly",
    billingDay: 3,
    colorClass: "bg-orange-500",
    domain: "aws.amazon.com",
    id: 6,
    name: "AWS",
  },
  {
    amount: 35.88,
    billingCycle: "yearly",
    billingDay: 15,
    billingMonth: 2,
    colorClass: "bg-blue-600",
    domain: "1password.com",
    id: 7,
    name: "1Password",
  },
  {
    amount: 96,
    billingCycle: "yearly",
    billingDay: 20,
    billingMonth: 0,
    colorClass: "bg-purple-600",
    domain: "linear.app",
    id: 8,
    name: "Linear",
  },
  {
    amount: 11.99,
    billingCycle: "monthly",
    billingDay: 1,
    colorClass: "bg-sky-500",
    domain: "dropbox.com",
    id: 9,
    name: "Dropbox",
  },
  {
    amount: 10,
    billingCycle: "monthly",
    billingDay: 1,
    colorClass: "bg-zinc-500",
    domain: "notion.so",
    id: 10,
    name: "Notion",
  },
  {
    amount: 14.99,
    billingCycle: "monthly",
    billingDay: 5,
    colorClass: "bg-emerald-600",
    domain: "hulu.com",
    id: 11,
    name: "Hulu",
  },
  {
    amount: 10.99,
    billingCycle: "monthly",
    billingDay: 12,
    colorClass: "bg-pink-600",
    domain: "music.apple.com",
    id: 12,
    name: "Apple Music",
  },
];

function billersOnDay(date: Date): Subscription[] {
  const day = date.getDate();
  const month = date.getMonth();
  return SUBSCRIPTIONS.filter((sub) => {
    if (sub.billingDay !== day) {
      return false;
    }
    if (sub.billingCycle === "monthly") {
      return true;
    }
    return sub.billingMonth === month;
  });
}

function calcMonthlyTotal(month: Date): number {
  const m = month.getMonth();
  let total = 0;
  for (const sub of SUBSCRIPTIONS) {
    if (sub.billingCycle === "monthly") {
      total += sub.amount;
    } else if (sub.billingCycle === "yearly" && sub.billingMonth === m) {
      total += sub.amount;
    }
  }
  return total;
}

function calcCumulativeTotal(month: Date, throughDay: number): number {
  const m = month.getMonth();
  let total = 0;
  for (const sub of SUBSCRIPTIONS) {
    if (sub.billingDay > throughDay) {
      continue;
    }
    if (sub.billingCycle === "monthly") {
      total += sub.amount;
    } else if (sub.billingCycle === "yearly" && sub.billingMonth === m) {
      total += sub.amount;
    }
  }
  return total;
}

const USD = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

function SubLogo({ sub }: { sub: Subscription }) {
  if (brandfetchClientId) {
    return (
      <span className="inline-flex shrink-0" title={sub.name}>
        <LogoCDN
          alt={sub.name}
          className="size-6 overflow-hidden rounded-full ring-1 ring-border/60"
          clientId={brandfetchClientId}
          domain={sub.domain}
          fallbackText={sub.name}
          imgClassName="object-cover"
          logoApiSize={112}
        />
      </span>
    );
  }

  return (
    <div
      title={sub.name}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
        sub.colorClass
      )}
    >
      {sub.name[0]}
    </div>
  );
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_VISIBLE_LOGOS = 3;

function MonthGrid({
  date,
  selectedDay,
  onSelectDay,
}: {
  date: Date;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = endOfMonth(date).getDate();
  const startPad = getDay(new Date(year, month, 1));

  const cells = useMemo(() => {
    const result: (
      | { kind: "day"; day: number; date: Date; reactKey: string }
      | { kind: "pad"; reactKey: string }
    )[] = [];
    for (let pad = 0; pad < startPad; pad += 1) {
      result.push({
        kind: "pad",
        reactKey: `subscriptions-cal-pad-${year}-${month}-${pad}`,
      });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      result.push({
        date: new Date(year, month, d),
        day: d,
        kind: "day",
        reactKey: `subscriptions-cal-day-${year}-${month}-${d}`,
      });
    }
    return result;
  }, [year, month, daysInMonth, startPad]);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.kind === "pad") {
            return <div key={cell.reactKey} />;
          }
          const billers = billersOnDay(cell.date);
          const today = isToday(cell.date);
          const selected = cell.day === selectedDay;
          const visible = billers.slice(0, MAX_VISIBLE_LOGOS);
          const overflow = billers.length - MAX_VISIBLE_LOGOS;

          const dayNumberClass = cn(
            "text-center text-sm font-semibold leading-none tabular-nums",
            selected || today
              ? "font-bold text-primary"
              : "text-muted-foreground"
          );

          return (
            <button
              type="button"
              key={cell.reactKey}
              onClick={() => onSelectDay(cell.day)}
              className={cn(
                "flex h-24 flex-col rounded-xl bg-input/30 p-1 text-center transition-colors hover:bg-input/50",
                today && "ring-2 ring-primary",
                selected && "ring-2 ring-primary"
              )}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {visible.length > 0 ? (
                  <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                    {visible.map((sub) => (
                      <SubLogo key={sub.id} sub={sub} />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[9px] font-semibold leading-none text-muted-foreground">
                        +{overflow}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0">
                <span className={dayNumberClass}>{cell.day}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BabySubscriptionsCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const title = format(currentDate, "MMMM yyyy");

  const monthTotal = useMemo(
    () => calcMonthlyTotal(currentDate),
    [currentDate]
  );
  const cumulative = useMemo(
    () => calcCumulativeTotal(currentDate, selectedDay),
    [currentDate, selectedDay]
  );

  const handlePrev = () => {
    setCurrentDate((d) => subMonths(d, 1));
    setSelectedDay(1);
  };

  const handleNext = () => {
    setCurrentDate((d) => addMonths(d, 1));
    setSelectedDay(1);
  };

  const selectedLabel = format(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay),
    "MMM d"
  );

  return (
    <div className="flex flex-col gap-3">
      <SegmentedGauge
        value={cumulative}
        max={monthTotal}
        label={USD.format(cumulative)}
        sublabel={`Paid by ${selectedLabel}`}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
          </button>
          <span className="text-sm font-semibold tabular-nums">{title}</span>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Monthly total:{" "}
          <span className="font-semibold text-foreground">
            {USD.format(monthTotal)}
          </span>
        </p>
      </div>

      <MonthGrid
        date={currentDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />
    </div>
  );
}
