import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";

/** Demo total — replace when subscriptions are wired up. */
const DEMO_MONTHLY_TOTAL_USD = 79;

const formatMonthTotal = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

export function DashboardSubscriptionsCalendar() {
  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());

  return (
    <section
      aria-label="Subscriptions and payments calendar"
      className="flex h-full min-h-0 w-full min-w-[min(100vw-2rem,26rem)] max-w-full flex-col sm:min-w-[28rem]"
    >
      <CobaltCard className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 w-full flex-1 flex-col p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground mb-5 text-lg font-medium whitespace-nowrap">
            Subscriptions &amp; payments
          </h2>

          <div className="mb-5 flex w-full items-baseline justify-between gap-4">
            <p className="text-foreground shrink-0 text-lg font-semibold tracking-tight">
              {format(monthStart, "MMMM yyyy")}
            </p>
            <p className="text-muted-foreground text-right text-base">
              Monthly total:{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {formatMonthTotal(DEMO_MONTHLY_TOTAL_USD)}
              </span>
            </p>
          </div>

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
              "[&_.rdp-weekday]:text-base [&_[data-slot=button]]:text-lg"
            )}
            classNames={{
              day: "border-0 shadow-none",
              month_caption: "hidden",
              nav: "hidden",
            }}
            defaultMonth={monthStart}
            mode="single"
            onSelect={setSelected}
            selected={selected}
            weekStartsOn={1}
          />
        </CardContent>
      </CobaltCard>
    </section>
  );
}
