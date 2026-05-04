import { logoDevUrlByBrandName } from "@cobalt-web/clients/logo-dev";
import { LogoImageWithFallback } from "@cobalt-web/ui/cobalt/logos/logo-image-fallback";
import { cn } from "@cobalt-web/ui/lib/utils";
import { endOfMonth, format, getDay, isToday } from "date-fns";
import { useMemo } from "react";

import { SegmentedGauge } from "@/components/subscriptions/segmented-gauge";

const logoDevToken =
  (import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";

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
    amount: 204,
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
    billingMonth: 3,
    colorClass: "bg-blue-600",
    domain: "1password.com",
    id: 7,
    name: "1Password",
  },
  {
    amount: 48,
    billingCycle: "yearly",
    billingDay: 20,
    billingMonth: 3,
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

/**
 * Trim raw names down to the first 1–2 meaningful words for logo.dev lookup.
 */
function logoLookupName(raw: string): string {
  const words = raw.trim().split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    if (/^[A-F0-9]{6,}$/i.test(w)) {
      break;
    }
    if (/^\d{4,}$/.test(w)) {
      break;
    }
    kept.push(w);
    if (kept.length >= 2) {
      break;
    }
  }
  return kept.join(" ") || raw.trim();
}

function SubLogo({ sub }: { sub: Subscription }) {
  const candidates = useMemo(() => {
    if (!logoDevToken) {
      return [];
    }
    const name = logoLookupName(sub.name);
    return [
      logoDevUrlByBrandName(name, {
        format: "png",
        size: 112,
        token: logoDevToken,
      }),
    ];
  }, [sub.name]);

  return (
    <LogoImageWithFallback
      alt={sub.name}
      candidates={candidates}
      className="size-4 shrink-0 overflow-hidden rounded-full ring-1 ring-border/60"
      fallbackText={sub.name}
      imgClassName="object-cover"
    />
  );
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_VISIBLE_LOGOS = 3;

function MonthGrid({ date }: { date: Date }) {
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
    <div className="flex flex-col gap-1 pb-8">
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
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
          const visible = billers.slice(0, MAX_VISIBLE_LOGOS);
          const overflow = billers.length - MAX_VISIBLE_LOGOS;

          const dayNumberClass = cn(
            "w-full text-center text-base font-semibold leading-none tabular-nums",
            today ? "font-bold text-primary" : "text-muted-foreground",
          );

          return (
            <button
              type="button"
              key={cell.reactKey}
              className={cn(
                "flex h-20 flex-col rounded-2xl bg-input/30 p-1.5 text-center transition-colors hover:bg-input/50",
                today && "ring-2 ring-primary",
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
              <div className="flex shrink-0 flex-col items-center gap-1.5 pb-0.5">
                <span className={dayNumberClass}>{cell.day}</span>
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    billers.length > 0 ? "bg-primary" : "opacity-0",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BabySubscriptionsCalendar() {
  const currentDate = useMemo(() => new Date(), []);
  const today = currentDate.getDate();

  const title = format(currentDate, "MMMM yyyy");

  const monthTotal = useMemo(() => calcMonthlyTotal(currentDate), [currentDate]);
  const paidToDate = useMemo(() => calcCumulativeTotal(currentDate, today), [currentDate, today]);
  const remaining = monthTotal - paidToDate;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <SegmentedGauge
        value={remaining}
        max={monthTotal}
        label={USD.format(remaining)}
        sublabel="Left to pay this month"
      />

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold tabular-nums">{title}</span>
        <p className="text-base text-muted-foreground">
          Monthly total:{" "}
          <span className="font-semibold text-foreground">{USD.format(monthTotal)}</span>
        </p>
      </div>

      <MonthGrid date={currentDate} />
    </div>
  );
}
