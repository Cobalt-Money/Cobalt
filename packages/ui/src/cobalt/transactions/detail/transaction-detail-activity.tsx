import type {
  TransactionActivityItem,
  TransactionListItem,
} from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Calendar03Icon,
  Coins01Icon,
  Location01Icon,
  Note01Icon,
  PencilEdit01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import { CategoryIcon, getCategoryDisplayConfig } from "../categories";
import { formatDateStringShort } from "../lib/helpers";

type BuiltinEventType = "authorized" | "pending" | "posted";
type EditEventType = `edit_${TransactionActivityItem["field"]}`;
type ActivityEventType = BuiltinEventType | EditEventType;

interface ActivityEvent {
  actor?: "user" | "system";
  date: string | null;
  description: string;
  id: string;
  type: ActivityEventType;
}

function getEventSortTime(event: ActivityEvent): number {
  if (!event.date) {
    return Number.POSITIVE_INFINITY;
  }
  const t = new Date(event.date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const TYPE_ORDER_NEWER_FIRST: ActivityEventType[] = [
  "edit_name",
  "edit_category",
  "edit_date",
  "edit_location",
  "edit_notes",
  "edit_amount",
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

function describeEditEvent(item: TransactionActivityItem): string {
  switch (item.field) {
    case "name": {
      return typeof item.newValue === "string"
        ? `Name changed to "${item.newValue}"`
        : "Name restored";
    }
    case "category": {
      const v = item.newValue as { primary?: string } | null;
      if (!v?.primary) {
        return "Category restored";
      }
      return `Category changed to ${v.primary.replaceAll("_", " ").toLowerCase()}`;
    }
    case "date": {
      return typeof item.newValue === "string"
        ? `Date changed to ${formatDateStringShort(item.newValue)}`
        : "Date restored";
    }
    case "notes": {
      return item.newValue ? "Notes updated" : "Notes cleared";
    }
    case "amount": {
      return typeof item.newValue === "number"
        ? `Amount changed to ${item.newValue}`
        : "Amount updated";
    }
    case "location": {
      return item.newValue ? "Location updated" : "Location cleared";
    }
    default: {
      return "Updated";
    }
  }
}

function buildActivityEvents(
  transaction: TransactionListItem,
  editEvents: TransactionActivityItem[]
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

  for (const item of editEvents) {
    if (item.field === "notes") {
      continue;
    }
    events.push({
      actor: item.actor,
      date: item.createdAt,
      description: describeEditEvent(item),
      id: item.id,
      type: `edit_${item.field}`,
    });
  }

  return sortActivityEventsNewestFirst(events);
}

const eventMarkerTone: Record<ActivityEventType, string> = {
  authorized: "text-muted-foreground",
  edit_amount: "text-muted-foreground",
  edit_category: "text-muted-foreground",
  edit_date: "text-muted-foreground",
  edit_location: "text-muted-foreground",
  edit_name: "text-muted-foreground",
  edit_notes: "text-muted-foreground",
  pending: "text-muted-foreground",
  posted: "text-muted-foreground",
};

const STATUS_PENDING_ICON = "/assets/vectors/pending.svg";
const STATUS_POSTED_ICON = "/assets/vectors/posted.svg";

function EventMarker({
  event,
  rawItem,
  transaction,
}: {
  event: ActivityEvent;
  rawItem?: TransactionActivityItem;
  transaction: TransactionListItem;
}) {
  const tone = eventMarkerTone[event.type] ?? "text-muted-foreground";

  if (event.type === "edit_category" && rawItem?.field === "category") {
    const value = rawItem.newValue as {
      primary?: string;
      detailed?: string;
    } | null;
    const fallback = transaction.category
      ? {
          detailed: transaction.categoryDetail ?? "",
          primary: transaction.category,
        }
      : null;
    const config = getCategoryDisplayConfig(
      value?.primary
        ? { detailed: value.detailed ?? "", primary: value.primary }
        : fallback
    );
    return (
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center",
          tone
        )}
      >
        <CategoryIcon icon={config.icon} />
      </span>
    );
  }

  if (event.type === "pending" || event.type === "posted") {
    return (
      <img
        alt=""
        aria-hidden
        className="size-4 shrink-0 object-contain"
        decoding="async"
        height={16}
        src={
          event.type === "pending" ? STATUS_PENDING_ICON : STATUS_POSTED_ICON
        }
        width={16}
      />
    );
  }

  const iconByType: Partial<Record<ActivityEventType, IconSvgElement>> = {
    authorized: Shield01Icon as IconSvgElement,
    edit_amount: Coins01Icon as IconSvgElement,
    edit_date: Calendar03Icon as IconSvgElement,
    edit_location: Location01Icon as IconSvgElement,
    edit_name: PencilEdit01Icon as IconSvgElement,
    edit_notes: Note01Icon as IconSvgElement,
  };

  const icon = iconByType[event.type];
  if (!icon) {
    return (
      <span
        className={cn("size-2.5 rounded-full", tone.replace("text-", "bg-"))}
      />
    );
  }

  return (
    <HugeiconsIcon
      aria-hidden
      className={cn("size-4 shrink-0", tone)}
      icon={icon}
      strokeWidth={2}
    />
  );
}

function ActivityEventRow({
  event,
  isLast,
  rawItem,
  transaction,
}: {
  event: ActivityEvent;
  isLast: boolean;
  rawItem?: TransactionActivityItem;
  transaction: TransactionListItem;
}) {
  return (
    <div className="relative flex items-start gap-3 pb-6 last:pb-0">
      {isLast ? null : (
        <div className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />
      )}

      <div className="relative z-10 flex h-5 w-4 shrink-0 items-center justify-center">
        <EventMarker
          event={event}
          rawItem={rawItem}
          transaction={transaction}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-muted-foreground text-sm leading-5">
            {event.description}
          </p>
          {event.actor === "system" ? (
            <p className="text-muted-foreground text-xs">Automatic</p>
          ) : null}
        </div>
        {event.date ? (
          <time className="shrink-0 text-muted-foreground text-xs leading-5 tabular-nums">
            {formatDateStringShort(event.date)}
          </time>
        ) : null}
      </div>
    </div>
  );
}

export function TransactionDetailActivity({
  editEvents,
  transaction,
}: {
  editEvents: TransactionActivityItem[];
  transaction: TransactionListItem;
}) {
  const events = buildActivityEvents(transaction, editEvents);

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
            rawItem={editEvents.find((e) => e.id === event.id)}
            transaction={transaction}
          />
        ))}
      </div>
    </div>
  );
}
