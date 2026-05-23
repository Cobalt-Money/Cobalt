import type {
  TransactionActivityItem,
  TransactionResponse,
} from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Calendar03Icon,
  Coins01Icon,
  Location01Icon,
  Note01Icon,
  PencilEdit01Icon,
  Shield01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import { formatDateStringShort } from "../lib/helpers";
import type { TagColor } from "../tags/palette";
import { TagChip } from "../tags/tag-chip";

export interface ActivityTagInfo {
  name: string;
  color: TagColor;
}
export type ActivityTagMap = Map<string, ActivityTagInfo>;

type BuiltinEventType = "authorized" | "pending" | "posted";
type EditEventType = `edit_${TransactionActivityItem["field"]}`;
type ActivityEventType = BuiltinEventType | EditEventType;

interface ActivityEvent {
  actor?: "user" | "system";
  date: string | null;
  description: ReactNode;
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
  "edit_merchantName",
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

function sortActivityEventsNewestFirst(events: ActivityEvent[]): ActivityEvent[] {
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

function renderTagChips(ids: string[], tagsById: ActivityTagMap | undefined): ReactNode {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {ids.map((id) => {
        const meta = tagsById?.get(id);
        if (meta) {
          return <TagChip color={meta.color} key={id} name={meta.name} size="sm" />;
        }
        return (
          <span
            className="inline-flex h-5 items-center rounded-full border border-foreground/15 bg-foreground/5 px-1.5 text-muted-foreground text-xs"
            key={id}
          >
            deleted tag
          </span>
        );
      })}
    </span>
  );
}

function describeTagsEdit(
  item: TransactionActivityItem,
  tagsById: ActivityTagMap | undefined,
): ReactNode {
  const oldArr = (Array.isArray(item.oldValue) ? item.oldValue : []) as string[];
  const newArr = (Array.isArray(item.newValue) ? item.newValue : []) as string[];
  const added = newArr.filter((id) => !oldArr.includes(id));
  const removed = oldArr.filter((id) => !newArr.includes(id));

  if (added.length === 0 && removed.length === 0) {
    return "Tags updated";
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {added.length > 0 ? (
        <>
          <span>Added</span>
          {renderTagChips(added, tagsById)}
        </>
      ) : null}
      {added.length > 0 && removed.length > 0 ? (
        <span className="text-muted-foreground">·</span>
      ) : null}
      {removed.length > 0 ? (
        <>
          <span>Removed</span>
          {renderTagChips(removed, tagsById)}
        </>
      ) : null}
    </span>
  );
}

function describeEditEvent(
  item: TransactionActivityItem,
  tagsById: ActivityTagMap | undefined,
): ReactNode {
  switch (item.field) {
    case "name": {
      return typeof item.newValue === "string"
        ? `Name changed to "${item.newValue}"`
        : "Name restored";
    }
    case "merchantName": {
      if (typeof item.newValue !== "string" || item.newValue.length === 0) {
        return "Merchant cleared";
      }
      return `Merchant changed to "${item.newValue}"`;
    }
    case "category": {
      const v = item.newValue as { categoryId?: string | null } | null;
      if (!v?.categoryId) {
        return "Category restored";
      }
      return "Category updated";
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
    case "tags": {
      return describeTagsEdit(item, tagsById);
    }
    default: {
      return "Updated";
    }
  }
}

function buildActivityEvents(
  transaction: TransactionResponse,
  editEvents: TransactionActivityItem[],
  tagsById: ActivityTagMap | undefined,
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
      description: describeEditEvent(item, tagsById),
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
  edit_merchantName: "text-muted-foreground",
  edit_name: "text-muted-foreground",
  edit_notes: "text-muted-foreground",
  edit_tags: "text-muted-foreground",
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
  transaction: TransactionResponse;
}) {
  const tone = eventMarkerTone[event.type] ?? "text-muted-foreground";

  if (event.type === "edit_category" && rawItem?.field === "category") {
    const cat = transaction.category;
    const icon = cat
      ? (resolveCategoryIcon(cat.iconKey) ?? UNKNOWN_CATEGORY_ICON)
      : UNKNOWN_CATEGORY_ICON;
    return (
      <span className={cn("inline-flex size-4 shrink-0 items-center justify-center", tone)}>
        <CategoryIcon icon={icon} />
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
        src={event.type === "pending" ? STATUS_PENDING_ICON : STATUS_POSTED_ICON}
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
    edit_tags: Tag01Icon as IconSvgElement,
  };

  const icon = iconByType[event.type];
  if (!icon) {
    return <span className={cn("size-2.5 rounded-full", tone.replace("text-", "bg-"))} />;
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
  transaction: TransactionResponse;
}) {
  return (
    <div className="relative flex items-start gap-3 pb-6 last:pb-0">
      {isLast ? null : <div className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />}

      <div className="relative z-10 flex h-5 w-4 shrink-0 items-center justify-center">
        <EventMarker event={event} rawItem={rawItem} transaction={transaction} />
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-muted-foreground text-sm leading-5">{event.description}</p>
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
  tagsById,
  transaction,
}: {
  editEvents: TransactionActivityItem[];
  tagsById?: ActivityTagMap;
  transaction: TransactionResponse;
}) {
  const events = buildActivityEvents(transaction, editEvents, tagsById);

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
