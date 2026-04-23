import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";

export function NetWorthSectionSkeleton() {
  return (
    <section aria-label="Net worth overview" className="w-full min-w-0">
      <CobaltCard className="overflow-hidden rounded-3xl py-3">
        <CardContent className="p-0">
          <div className="flex flex-col lg:min-h-[380px] lg:flex-row lg:items-stretch">
            {/* Left: chart area */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-5 sm:gap-5 sm:px-6">
              {/* Header */}
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-40" />
                </div>
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>

              {/* Time range buttons */}
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton className="h-8 w-12 rounded-full" key={i} />
                ))}
              </div>

              {/* Chart area */}
              <div className="text-muted-foreground min-h-[200px] w-full min-w-0 flex-1 sm:min-h-[220px]">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            </div>

            {/* Right: categories donut */}
            <div className="border-border/60 flex w-full shrink-0 flex-col gap-4 border-t px-5 sm:px-6 lg:w-[min(100%,20rem)] lg:border-t-0 lg:border-l">
              <Skeleton className="h-4 w-20" />

              {/* Donut placeholder */}
              <div className="flex justify-center">
                <Skeleton className="h-[180px] w-[180px] rounded-full sm:h-[200px] sm:w-[200px]" />
              </div>

              {/* Categories grid */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-3.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div className="space-y-2" key={i}>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </CobaltCard>
    </section>
  );
}
