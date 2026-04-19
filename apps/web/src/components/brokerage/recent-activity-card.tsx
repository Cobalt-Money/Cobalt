import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Button } from "@cobalt-web/ui/components/button";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

export interface ActivityRow {
  id: string;
  type?: string | null;
  symbol?: unknown;
  symbolTicker?: string | null;
  symbolDescription?: string | null;
  amount?: number | null;
  price?: number | null;
  tradeDate?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

const ACTIVITY_PAGE_SIZE = 7;

type ActivityPagerEntry =
  | { key: string; kind: "page"; page: number }
  | { key: string; kind: "ellipsis" };

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatEpochDate(ms: number | null | undefined) {
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    return "—";
  }
  return format(new Date(ms), "MMM d, yyyy");
}

function activitySymbolLabel(a: ActivityRow): string {
  const ticker = a.symbolTicker?.trim();
  if (ticker) {
    return ticker;
  }
  const sym = a.symbol;
  if (typeof sym === "string" && sym.trim()) {
    return sym.trim();
  }
  return "—";
}

function activityVisiblePages(
  currentPage: number,
  totalPages: number
): ActivityPagerEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => {
      const page = i + 1;
      return { key: `page-${page}`, kind: "page" as const, page };
    });
  }
  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= totalPages)
    .toSorted((a, b) => a - b);
  const out: ActivityPagerEntry[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      out.push({ key: `ellipsis-${prev}-before-${n}`, kind: "ellipsis" });
    }
    out.push({ key: `page-${n}`, kind: "page", page: n });
    prev = n;
  }
  return out;
}

export function RecentActivityCard({
  scopedActivities,
  allActivities,
}: {
  scopedActivities: readonly ActivityRow[];
  allActivities: readonly ActivityRow[];
}) {
  const [activityPageIndex, setActivityPageIndex] = useState(0);

  const activityTotalPages = Math.max(
    1,
    Math.ceil(scopedActivities.length / ACTIVITY_PAGE_SIZE)
  );

  useEffect(() => {
    const maxIdx = activityTotalPages - 1;
    setActivityPageIndex((i) => (i > maxIdx ? maxIdx : i));
  }, [activityTotalPages]);

  const activityPageSlice = useMemo(() => {
    const start = activityPageIndex * ACTIVITY_PAGE_SIZE;
    return scopedActivities.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [scopedActivities, activityPageIndex]);

  const activityPageNumber = activityPageIndex + 1;
  const activityPagerItems = useMemo(
    () => activityVisiblePages(activityPageNumber, activityTotalPages),
    [activityPageNumber, activityTotalPages]
  );

  return (
    <CobaltCard className="flex h-full min-h-0 flex-col gap-0 rounded-3xl py-0 lg:min-h-[400px]">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4">
        <div className="shrink-0">
          <p className="text-muted-foreground text-[11px] font-medium tracking uppercase">
            Recent activity
          </p>
        </div>
        <ul className="flex-1">
          {scopedActivities.length === 0 ? (
            <li className="text-muted-foreground list-none py-8 text-center text-sm">
              {allActivities.length === 0
                ? "No recent activity"
                : "No activity for selected accounts"}
            </li>
          ) : (
            activityPageSlice.map((a) => {
              const sym = activitySymbolLabel(a);
              return (
                <li key={a.id} className="flex gap-3 py-2 first:pt-0 last:pb-0">
                  <TickerLogo size={36} symbol={sym} />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {sym}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {(a.type ?? "Activity") +
                        (a.brokerageAccount?.name
                          ? ` · ${a.brokerageAccount.name}`
                          : "")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-foreground text-sm font-medium tabular-nums">
                      {a.amount === undefined || a.amount === null
                        ? "—"
                        : money(a.amount)}
                    </p>
                    <p className="text-muted-foreground text-[11px] tabular-nums">
                      {formatEpochDate(a.tradeDate)}
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        {scopedActivities.length > ACTIVITY_PAGE_SIZE ? (
          <nav
            aria-label="Recent activity pages"
            className="flex min-h-8 shrink-0 flex-wrap items-center justify-center gap-1"
          >
            <Button
              aria-label="Previous page"
              className="size-8"
              disabled={activityPageIndex <= 0}
              onClick={() => setActivityPageIndex((i) => Math.max(0, i - 1))}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Button>
            {activityPagerItems.map((item) =>
              item.kind === "ellipsis" ? (
                <span
                  aria-hidden
                  className="text-muted-foreground flex size-8 items-center justify-center text-xs"
                  key={item.key}
                >
                  …
                </span>
              ) : (
                <Button
                  aria-current={
                    item.page === activityPageNumber ? "page" : undefined
                  }
                  aria-label={`Page ${item.page}`}
                  className="size-8 min-w-8 px-0 text-xs"
                  key={item.key}
                  onClick={() => setActivityPageIndex(item.page - 1)}
                  size="icon-sm"
                  type="button"
                  variant={
                    item.page === activityPageNumber ? "outline" : "ghost"
                  }
                >
                  {item.page}
                </Button>
              )
            )}
            <Button
              aria-label="Next page"
              className="size-8"
              disabled={activityPageIndex >= activityTotalPages - 1}
              onClick={() =>
                setActivityPageIndex((i) =>
                  Math.min(activityTotalPages - 1, i + 1)
                )
              }
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          </nav>
        ) : (
          <div aria-hidden className="min-h-8 shrink-0" />
        )}
      </CardContent>
    </CobaltCard>
  );
}
