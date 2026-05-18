import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { cn } from "@cobalt-web/ui/lib/utils";
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
}

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
}

export function BabyTransactions({ items, onOpen }: BabyTransactionsProps) {
  const sections = groupByMonth(items);

  return (
    <div className="flex flex-col">
      {sections.map((section) => (
        <Fragment key={section.monthKey}>
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-muted px-3 py-1.5">
            <span className="text-sm font-medium text-foreground">{section.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {section.rows.length} transactions
            </span>
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
                className="group flex cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {logoSrc ? (
                    <img alt={tx.name} className="size-full object-cover" src={logoSrc} />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {tx.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-[1.2]" title={tx.name}>
                  <p className="truncate text-sm font-medium">{displayName}</p>
                </div>

                <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
                  {icon ? <CategoryIcon icon={icon} sizeClassName="size-4" /> : null}
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {groupLabel ?? catName ?? ""}
                    {groupLabel && catName ? (
                      <span className="text-muted-foreground/60"> › {catName}</span>
                    ) : null}
                  </span>
                </div>

                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateDisplay(tx.date)}
                </span>

                <span
                  className={cn(
                    "w-20 shrink-0 text-right text-sm font-medium tabular-nums",
                    amountColor,
                  )}
                >
                  {currency.format(Math.abs(tx.amount))}
                </span>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
