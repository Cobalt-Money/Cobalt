import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";

export function DashboardInvestmentPerformanceCardSkeleton() {
  return (
    <section aria-label="Portfolio holdings performance" className="h-full min-w-0 w-full">
      <Card
        variant="subtle"
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4"
      >
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground text-lg font-medium">Portfolio performance</h2>

          <ul className="flex flex-col gap-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <li className="flex min-w-0 items-center justify-between gap-3 py-3" key={i}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-5 w-12 shrink-0" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
