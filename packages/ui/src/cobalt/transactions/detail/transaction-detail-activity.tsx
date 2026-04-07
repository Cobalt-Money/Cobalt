import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";

import { formatDateStringShort } from "../lib/helpers";

type ActivityEventType =
  | "authorized"
  | "override_category"
  | "override_date"
  | "override_name"
  | "pending"
  | "posted";

interface ActivityEvent {
  date: string | null;
  description: string;
  id: string;
  type: ActivityEventType;
}

/** Sort key for chronological order: newer first (top), older last (bottom). */
function getEventSortTime(event: ActivityEvent): number {
  if (event.date) {
    const day = String(event.date).split("T")[0] ?? String(event.date);
    const t = new Date(`${day}T12:00:00.000Z`).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  // Overrides without a server timestamp: treat as most recent (typical case).
  return Number.POSITIVE_INFINITY;
}

/** When two events share the same calendar day, prefer this narrative order (newer types first). */
const TYPE_ORDER_NEWER_FIRST: ActivityEventType[] = [
  "override_date",
  "override_category",
  "override_name",
  "posted",
  "pending",
  "authorized",
];

function typeOrderRank(t: ActivityEventType): number {
  const i = TYPE_ORDER_NEWER_FIRST.indexOf(t);
  return i === -1 ? 0 : i;
}

function sortActivityEventsNewestFirst(
  events: ActivityEvent[]
): ActivityEvent[] {
  return [...events].toSorted((a, b) => {
    const tb = getEventSortTime(b);
    const ta = getEventSortTime(a);
    if (tb !== ta) {
      return tb - ta;
    }
    const rankDiff = typeOrderRank(a.type) - typeOrderRank(b.type);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

function buildActivityEvents(
  transaction: TransactionListItem
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  if (transaction.authorizedDate) {
    events.push({
      date: transaction.authorizedDate,
      description: `Authorized${transaction.merchantName ? ` at ${transaction.merchantName}` : ""}`,
      id: "authorized",
      type: "authorized",
    });
  }

  if (transaction.pending) {
    events.push({
      date: transaction.date,
      description: "Transaction pending",
      id: "pending",
      type: "pending",
    });
  } else {
    events.push({
      date: transaction.date,
      description: `Posted to ${transaction.accountName}`,
      id: "posted",
      type: "posted",
    });
  }

  if (
    transaction.userOverrideName &&
    transaction.userOverrideName !== transaction.name
  ) {
    events.push({
      date: null,
      description: `Name changed to "${transaction.userOverrideName}"`,
      id: "override_name",
      type: "override_name",
    });
  }

  if (transaction.userOverrideCategory) {
    events.push({
      date: null,
      description: "Category updated",
      id: "override_category",
      type: "override_category",
    });
  }

  if (transaction.userOverrideDate) {
    events.push({
      date: null,
      description: `Date changed to ${formatDateStringShort(transaction.userOverrideDate)}`,
      id: "override_date",
      type: "override_date",
    });
  }

  return sortActivityEventsNewestFirst(events);
}

const eventDotColor: Record<ActivityEventType, string> = {
  authorized: "bg-blue-500",
  override_category: "bg-violet-500",
  override_date: "bg-violet-500",
  override_name: "bg-violet-500",
  pending: "bg-yellow-500",
  posted: "bg-green-600 dark:bg-green-500",
};

function ActivityEventRow({
  event,
  isLast,
}: {
  event: ActivityEvent;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Vertical connector line */}
      {isLast ? null : (
        <div className="absolute top-3 bottom-0 left-[7px] w-px bg-border" />
      )}

      {/* Dot */}
      <div className="relative z-10 flex size-[15px] shrink-0 items-center justify-center pt-0.5">
        <span
          className={cn("size-2.5 rounded-full", eventDotColor[event.type])}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pt-px">
        <p className="text-foreground text-sm">{event.description}</p>
        {event.date ? (
          <time className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {formatDateStringShort(event.date)}
          </time>
        ) : null}
      </div>
    </div>
  );
}

export function TransactionDetailActivity({
  transaction,
}: {
  transaction: TransactionListItem;
}) {
  const events = buildActivityEvents(transaction);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Activity
      </h2>
      <div>
        {events.map((event, i) => (
          <ActivityEventRow
            event={event}
            isLast={i === events.length - 1}
            key={event.id}
          />
        ))}
      </div>
    </div>
  );
}
