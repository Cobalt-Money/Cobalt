import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";

export function DashboardSubscriptionsCalendarSkeleton() {
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

          <div className="mb-5 flex w-full items-baseline justify-between gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, week) => (
              <div key={week} className="flex gap-1.5">
                {Array.from({ length: 7 }).map((__, day) => (
                  <Skeleton className="size-13 rounded-2xl" key={`${week}-${day}`} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </CobaltCard>
    </section>
  );
}
