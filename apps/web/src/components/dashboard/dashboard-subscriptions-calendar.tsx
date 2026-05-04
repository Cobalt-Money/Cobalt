import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { format, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";

import { DashboardSubscriptionsCalendarSkeleton } from "@/components/dashboard/skeletons/dashboard-subscriptions-calendar-skeleton";
import { ConnectAccountEmpty } from "@/components/empty/connect-account-empty";

const formatMonthTotal = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

interface RecurringRow {
  streamType: string;
  lastAmount: number;
  lastDate?: number | null;
  predictedNextDate?: number | null;
}

export function DashboardSubscriptionsCalendar() {
  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());

  const [rawStreams, result] = useQuery(queries.transactions.recurring());
  const streams = rawStreams as unknown as RecurringRow[];
  const isComplete = result.type === "complete";

  const outflows = useMemo(() => streams.filter((s) => s.streamType === "outflow"), [streams]);

  const monthlyTotal = useMemo(
    () => outflows.reduce((sum, s) => sum + Math.abs(s.lastAmount), 0),
    [outflows],
  );

  /** Days in the current month that have a past or predicted payment. */
  const subscriptionDays = useMemo(() => {
    const currentMonth = monthStart.getMonth();
    const currentYear = monthStart.getFullYear();
    const seen = new Set<string>();
    const dates: Date[] = [];

    const addDate = (epochMs: number) => {
      const d = new Date(epochMs);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate();
      if (year === currentYear && month === currentMonth) {
        const key = `${String(year)}-${String(month)}-${String(day)}`;
        if (!seen.has(key)) {
          seen.add(key);
          dates.push(new Date(year, month, day));
        }
      }
    };

    for (const s of outflows) {
      if (typeof s.lastDate === "number") {
        addDate(s.lastDate);
      }
      if (typeof s.predictedNextDate === "number") {
        addDate(s.predictedNextDate);
      }
    }

    return dates;
  }, [outflows, monthStart]);

  if (!isComplete && streams.length === 0) {
    return <DashboardSubscriptionsCalendarSkeleton />;
  }

  return (
    <section
      aria-label="Subscriptions and payments calendar"
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col"
    >
      <CobaltCard className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 w-full flex-1 flex-col p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground mb-5 text-lg font-medium whitespace-nowrap">
            Subscriptions &amp; payments
          </h2>

          {outflows.length === 0 ? null : (
            <div className="mb-5 flex w-full items-baseline justify-between gap-4">
              <p className="text-foreground shrink-0 text-lg font-semibold tracking-tight">
                {format(monthStart, "MMMM yyyy")}
              </p>
              <p className="text-muted-foreground text-right text-base">
                Monthly total:{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  <PrivateAmount>{formatMonthTotal(monthlyTotal)}</PrivateAmount>
                </span>
              </p>
            </div>
          )}

          {outflows.length === 0 ? (
            <ConnectAccountEmpty
              className="min-h-[260px] border-0"
              description="Connect a bank to automatically detect recurring subscriptions and bills."
              title="No subscriptions detected yet"
            />
          ) : null}

          {outflows.length === 0 ? null : (
            <Calendar
              className={cn(
                "border-0 bg-transparent p-0 pt-1 shadow-none ring-0",
                "[--cell-size:--spacing(13)]",
                "[--cell-radius:var(--radius-2xl)]",
                "[&_.rdp-month]:gap-2.5",
                "[&_.rdp-weekdays]:gap-1.5",
                "[&_.rdp-week]:gap-1.5",
                "[&_[data-slot=button]]:!rounded-2xl",
                "[&_[data-slot=button]]:border-0 [&_[data-slot=button]]:shadow-none",
                "[&_[data-slot=button]]:bg-muted/80 [&_[data-slot=button]]:hover:bg-muted/95",
                "[&_[data-slot=button][data-selected-single=true]]:!bg-primary",
                "[&_[data-slot=button][data-selected-single=true]]:!text-primary-foreground",
                "[&_[data-slot=button][data-selected-single=true]]:hover:!bg-primary/90",
                "[&_.rdp-weekday]:text-base [&_[data-slot=button]]:text-lg",
              )}
              classNames={{
                day: "relative rounded-2xl border-0 shadow-none",
                month_caption: "hidden",
                nav: "hidden",
              }}
              defaultMonth={monthStart}
              modifiers={{ subscription: subscriptionDays }}
              modifiersClassNames={{
                subscription:
                  "after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-[#ffffff] after:content-['']",
              }}
              mode="single"
              onSelect={setSelected}
              selected={selected}
              weekStartsOn={1}
            />
          )}
        </CardContent>
      </CobaltCard>
    </section>
  );
}
