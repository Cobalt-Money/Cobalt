import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { TagChip } from "@cobalt-web/ui/cobalt/transactions/tags/tag-chip";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment } from "react";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const monthGroupHeading = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const STATUS_POSTED_ICON = "/assets/vectors/posted.svg";

// Mirrors the real TransactionsTable grid template — minus columns we don't
// stub in the landing preview (select, bank). Status / date / name /
// category / tags / amount keep the same proportions so rows align like
// production.
const GRID_TEMPLATE_COLUMNS = "3rem 7rem minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1fr) 7rem";

const ROW_HEIGHT = 52;

const cellRow = "flex items-center leading-5";

function truncateName(name: string, max = 40): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max)}…`;
}

function formatDateDisplay(dateStr: string): string {
  const day = dateStr.split("T")[0] ?? dateStr;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00.000Z`));
}

function monthGroupKey(dateStr: string): string {
  const day = dateStr.split("T")[0] ?? dateStr;
  const parts = day.split("-");
  if (parts.length < 2) {
    return "unknown";
  }
  const [y, mo] = parts;
  const m = (mo ?? "01").padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(yearMonth: string): string {
  if (yearMonth === "unknown") {
    return "Unknown date";
  }
  const [ys, ms] = yearMonth.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) {
    return yearMonth;
  }
  return monthGroupHeading.format(new Date(Date.UTC(y, m - 1, 1, 12, 0, 0)));
}

function faviconFor(website: string | null): string | null {
  if (!website) {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${website}&sz=64`;
}

export interface BabyTransactionCategory {
  iconKey: string;
  name: string;
  groupName?: string | null;
}

export interface BabyTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  logoUrl: string | null;
  website: string | null;
  category: BabyTransactionCategory | null;
  tagIds?: readonly string[];
}

export type BabyTagsById = ReadonlyMap<string, { name: string; color: TagColor }>;

interface MonthSection {
  label: string;
  monthKey: string;
  rows: BabyTransaction[];
}

function groupByMonth(items: BabyTransaction[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const tx of items) {
    const key = monthGroupKey(tx.date);
    const last = sections.at(-1);
    if (!last || last.monthKey !== key) {
      sections.push({
        label: formatMonthLabel(key),
        monthKey: key,
        rows: [tx],
      });
    } else {
      last.rows.push(tx);
    }
  }
  return sections;
}

interface BabyTransactionsProps {
  items: BabyTransaction[];
  onOpen?: (tx: BabyTransaction) => void;
  tagsById?: BabyTagsById;
}

export function BabyTransactions({ items, onOpen, tagsById }: BabyTransactionsProps) {
  const sections = groupByMonth(items);

  return (
    <div className="flex flex-col px-2 pb-2">
      {sections.map((section) => (
        <Fragment key={section.monthKey}>
          <div
            className="sticky top-0 z-10 grid rounded-lg bg-sidebar font-medium text-foreground"
            role="row"
            style={{
              gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
              height: ROW_HEIGHT,
            }}
          >
            <div className="flex items-center p-3" role="cell">
              <span className="font-normal tabular-nums text-muted-foreground text-sm">
                {section.rows.length}
              </span>
            </div>
            <div className="flex items-center p-3" role="cell">
              <span className="truncate whitespace-nowrap font-medium text-foreground text-sm">
                {section.label}
              </span>
            </div>
            <div className="p-3" role="presentation" />
            <div className="p-3" role="presentation" />
            <div className="p-3" role="presentation" />
            <div className="p-3" role="presentation" />
          </div>

          {section.rows.map((tx) => {
            const isSpending = tx.amount < 0;
            const amountColor = isSpending ? "text-destructive" : "text-success";
            const displayName = truncateName(tx.name);
            const icon = tx.category
              ? (resolveCategoryIcon(tx.category.iconKey) ?? UNKNOWN_CATEGORY_ICON)
              : null;
            const groupLabel = tx.category?.groupName;
            const catName = tx.category?.name;
            const logoSrc = tx.logoUrl ?? faviconFor(tx.website);

            return (
              <button
                type="button"
                key={tx.id}
                onClick={() => onOpen?.(tx)}
                aria-label={`View details for ${tx.name}`}
                className="group grid cursor-pointer text-left font-normal"
                style={{
                  gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                  height: ROW_HEIGHT,
                }}
              >
                {/* Status */}
                <div className="flex min-w-0 items-center p-3 group-hover:rounded-l-lg group-hover:bg-muted">
                  <div className={cn(cellRow, "whitespace-nowrap")}>
                    <img
                      alt="Posted"
                      className="size-5 shrink-0 object-contain"
                      decoding="async"
                      height={20}
                      src={STATUS_POSTED_ICON}
                      width={20}
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="flex min-w-0 items-center p-3 group-hover:bg-muted">
                  <div className={cn(cellRow, "whitespace-nowrap text-sm")}>
                    {formatDateDisplay(tx.date)}
                  </div>
                </div>

                {/* Name + merchant logo */}
                <div className="flex min-w-0 items-center p-3 group-hover:bg-muted" title={tx.name}>
                  <div className={cn(cellRow, "min-w-0 gap-2")}>
                    <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {logoSrc ? (
                        <img alt={tx.name} className="size-full object-cover" src={logoSrc} />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {tx.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 truncate text-sm">{displayName}</span>
                  </div>
                </div>

                {/* Category */}
                <div className="flex min-w-0 items-center p-3 group-hover:bg-muted">
                  {tx.category ? (
                    <div
                      className={cn(cellRow, "min-w-0 gap-2")}
                      title={groupLabel ? `${groupLabel} › ${catName}` : (catName ?? "")}
                    >
                      {icon ? <CategoryIcon icon={icon} /> : null}
                      <div className={cn(cellRow, "min-w-0 gap-1.5 text-sm")}>
                        <span className="min-w-0 truncate text-foreground lg:hidden">
                          {catName}
                        </span>
                        <span className="hidden shrink-0 text-foreground lg:inline">
                          {groupLabel ?? catName}
                        </span>
                        {groupLabel ? (
                          <span className="hidden min-w-0 items-center gap-1.5 lg:inline-flex">
                            <HugeiconsIcon
                              aria-hidden
                              className="size-3 shrink-0 text-muted-foreground"
                              icon={ArrowRight01Icon}
                              strokeWidth={2}
                            />
                            <span className="min-w-0 truncate text-muted-foreground">
                              {catName}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className={cellRow}>—</div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex min-w-0 items-center p-3 group-hover:bg-muted">
                  {tagsById && tx.tagIds && tx.tagIds.length > 0 ? (
                    <div className={cn(cellRow, "min-w-0 gap-1")}>
                      {tx.tagIds.slice(0, 2).map((id) => {
                        const t = tagsById.get(id);
                        if (!t) {
                          return null;
                        }
                        return <TagChip color={t.color} key={id} name={t.name} size="sm" />;
                      })}
                      {tx.tagIds.length > 2 ? (
                        <span className="shrink-0 text-muted-foreground text-xs">
                          +{tx.tagIds.length - 2}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Amount */}
                <div className="flex min-w-0 items-center p-3 group-hover:rounded-r-lg group-hover:bg-muted">
                  <div
                    className={cn(
                      cellRow,
                      "w-full justify-end whitespace-nowrap tabular-nums text-sm",
                      amountColor,
                    )}
                  >
                    {currency.format(Math.abs(tx.amount))}
                  </div>
                </div>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
