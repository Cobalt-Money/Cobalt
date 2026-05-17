import { logoDevUrlByBrandName } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import { LogoImageWithFallback } from "@cobalt-web/ui/cobalt/logos/logo-image-fallback";
import { Button } from "@cobalt-web/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@cobalt-web/ui/components/dialog";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { usePrivacy } from "@cobalt-web/ui/hooks/use-privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { endOfMonth, format, getDay, isToday } from "date-fns";
import { useMemo, useState } from "react";

import type { Subscription } from "@/hooks/use-subscriptions";
import { useSubscriptions } from "@/hooks/use-subscriptions";

import { SegmentedGauge } from "./segmented-gauge";

const logoDevToken = env.VITE_LOGO_DEV_PUBLISHABLE_KEY?.trim() ?? "";

function billersOnDay(date: Date, subscriptions: readonly Subscription[]): Subscription[] {
  const day = date.getDate();
  const month = date.getMonth();
  return subscriptions.filter((sub) => {
    if (sub.billingDay !== day) {
      return false;
    }
    if (sub.billingCycle === "monthly") {
      return true;
    }
    return sub.billingMonth === month;
  });
}

function calcMonthlyTotal(month: Date, subscriptions: readonly Subscription[]): number {
  const m = month.getMonth();
  let total = 0;
  for (const sub of subscriptions) {
    if (sub.billingCycle === "monthly") {
      total += sub.amount;
    } else if (sub.billingCycle === "yearly" && sub.billingMonth === m) {
      total += sub.amount;
    }
  }
  return total;
}

function calcCumulativeTotal(
  month: Date,
  throughDay: number,
  subscriptions: readonly Subscription[],
): number {
  const m = month.getMonth();
  let total = 0;
  for (const sub of subscriptions) {
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

// ── Day dialog ────────────────────────────────────────────────────

const FREQUENCY_LABEL: Record<string, string> = {
  ANNUALLY: "Yearly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  SEMI_MONTHLY: "Twice a month",
  UNKNOWN: "Recurring",
  WEEKLY: "Weekly",
};

function SubscriptionRow({ sub }: { sub: Subscription }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-2">
      <SubLogo sub={sub} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium leading-snug">{displayName(sub.name)}</span>
        <span className="text-xs text-muted-foreground">
          {FREQUENCY_LABEL[sub.billingCycle === "yearly" ? "ANNUALLY" : "MONTHLY"] ?? "Recurring"}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        <PrivateAmount>{USD.format(sub.amount)}</PrivateAmount>
      </span>
    </div>
  );
}

function DayDialog({
  date,
  billers,
  open,
  onOpenChange,
}: {
  date: Date | null;
  billers: Subscription[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dayTotal = billers.reduce((sum, s) => sum + s.amount, 0);
  const title = date ? format(date, "MMMM d, yyyy") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {billers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments due on this date.</p>
        ) : (
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 flex-col">
              {billers.map((sub) => (
                <SubscriptionRow key={sub.id} sub={sub} />
              ))}
            </div>

            {billers.length > 1 && (
              <div className="mt-1 flex items-center justify-between border-t border-border px-1.5 pt-3">
                <span className="text-xs text-muted-foreground">Total due</span>
                <span className="text-sm font-semibold tabular-nums">
                  <PrivateAmount>{USD.format(dayTotal)}</PrivateAmount>
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ────────────────────────────────────────────────

/**
 * Trim Plaid raw descriptions down to the first 1–3 meaningful words for
 * logo.dev name lookup. Stops before UUID-style hex chunks, long digit runs,
 * or once we have 3 words.
 *
 * "CAPITAL ONE CRCARDPMT CA09F4F6C85B0C6 Sriket Y Komali" → "CAPITAL ONE"
 * "Netflix.com" → "Netflix.com"  (single word, kept as-is)
 */
function logoLookupName(raw: string): string {
  const words = raw.trim().split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    if (/^[A-F0-9]{6,}$/i.test(w)) {
      break;
    } // hex transaction ID
    if (/^\d{4,}$/.test(w)) {
      break;
    } // long digit run
    kept.push(w);
    if (kept.length >= 2) {
      break;
    } // cap at 2 words — enough for name matching
  }
  return kept.join(" ") || raw.trim();
}

/** Cleaned, title-cased name for display. "AMEX EPAYMENT ACH PMT 260420 ..." → "Amex Epayment" */
function displayName(raw: string): string {
  return logoLookupName(raw)
    .toLowerCase()
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
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
      className="size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border/60"
      fallbackText={sub.name}
      imgClassName="object-cover"
    />
  );
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Show up to 3 avatars; +N when more bill that day. */
const MAX_VISIBLE_LOGOS = 3;

function MonthGrid({
  date,
  subscriptions,
  onSelectDay,
}: {
  date: Date;
  subscriptions: readonly Subscription[];
  onSelectDay: (date: Date) => void;
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
    <div className="flex flex-col gap-1 pb-8">
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.kind === "pad") {
            return <div key={cell.reactKey} />;
          }
          const billers = billersOnDay(cell.date, subscriptions);
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
              onClick={() => onSelectDay(cell.date)}
              className={cn(
                // Match site header Command+K search control: `bg-input/30` / `hover:bg-input/50`
                "flex h-24 flex-col rounded-2xl bg-input/30 p-1.5 text-center transition-colors hover:bg-input/50",
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

// ── Main ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-input/30 px-6 py-8 text-center">
      <p className="text-base font-semibold">No subscriptions yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        We&apos;ll detect recurring payments automatically once you have a few months of
        transactions. You can also add one manually.
      </p>
      <Button disabled size="sm" variant="outline" className="mt-1">
        Add subscription
      </Button>
    </div>
  );
}

export function SubscriptionsCalendar() {
  const { isComplete, subscriptions } = useSubscriptions();
  const currentDate = useMemo(() => new Date(), []);
  const today = currentDate.getDate();
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const { mask } = usePrivacy();

  const title = format(currentDate, "MMMM yyyy");

  const monthTotal = useMemo(
    () => calcMonthlyTotal(currentDate, subscriptions),
    [currentDate, subscriptions],
  );
  const paidToDate = useMemo(
    () => calcCumulativeTotal(currentDate, today, subscriptions),
    [currentDate, today, subscriptions],
  );
  const remaining = monthTotal - paidToDate;

  const dialogBillers = useMemo(
    () => (dialogDate ? billersOnDay(dialogDate, subscriptions) : []),
    [dialogDate, subscriptions],
  );

  const handleSelectDay = (date: Date) => {
    setDialogDate(date);
  };

  const isEmpty = isComplete && subscriptions.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {isEmpty ? (
        <EmptyState />
      ) : (
        <SegmentedGauge
          value={remaining}
          max={monthTotal}
          label={mask(USD.format(remaining))}
          sublabel="Left to pay this month"
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold tabular-nums">{title}</span>
        {!isEmpty && (
          <p className="text-base text-muted-foreground">
            Monthly total:{" "}
            <span className="font-semibold text-foreground">
              <PrivateAmount>{USD.format(monthTotal)}</PrivateAmount>
            </span>
          </p>
        )}
      </div>

      <MonthGrid
        date={currentDate}
        subscriptions={isEmpty ? [] : subscriptions}
        onSelectDay={handleSelectDay}
      />

      <DayDialog
        date={dialogDate}
        billers={dialogBillers}
        open={dialogDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogDate(null);
          }
        }}
      />
    </div>
  );
}
