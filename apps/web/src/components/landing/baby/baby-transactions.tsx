import {
  CategoryIcon,
  getCategoryDisplayConfig,
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

interface BabyTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  logoUrl: string | null;
  website: string | null;
  personalFinanceCategory: {
    detailed: string;
    primary: string;
  } | null;
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
}

export function BabyTransactions({ items }: BabyTransactionsProps) {
  const sections = groupByMonth(items);

  return (
    <div className="flex flex-col">
      {sections.map((section) => (
        <Fragment key={section.monthKey}>
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-muted px-3 py-1.5">
            <span className="rounded-l-lg text-sm font-medium text-foreground">
              {section.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {section.rows.length} transactions
            </span>
          </div>
          {section.rows.map((tx) => {
            const isDebit = tx.amount >= 0;
            const amountColor = isDebit
              ? "text-red-600 dark:text-red-500"
              : "text-green-550";
            const displayName = truncateName(tx.name);
            const categoryConfig = tx.personalFinanceCategory
              ? getCategoryDisplayConfig(tx.personalFinanceCategory)
              : null;

            return (
              <div
                key={tx.id}
                className="group flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
              >
                {/* Logo */}
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {tx.logoUrl ? (
                    <img
                      alt={tx.name}
                      className="size-full object-cover"
                      src={tx.logoUrl}
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {tx.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + category */}
                <div className="min-w-0 flex-1" title={tx.name}>
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {categoryConfig ? (
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon icon={categoryConfig.icon} />
                      <span className="truncate text-xs text-muted-foreground">
                        {categoryConfig.label}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Date */}
                <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateDisplay(tx.date)}
                </span>

                {/* Amount */}
                <span
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    amountColor
                  )}
                >
                  {currency.format(Math.abs(tx.amount))}
                </span>
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
