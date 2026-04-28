import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Date shown in the table: the posting `date` — matches the server's `orderBy("date", "desc")`. */
export function getTransactionDisplayDateString(
  row: Pick<TransactionListItem, "date">
): string {
  return row.date;
}

/**
 * Name shown anywhere in the app. When the user locks `name` (edited it),
 * prefer the column value. Otherwise fall back to the friendlier
 * `merchantName` from Plaid for unedited rows.
 */
export function getTransactionDisplayName(
  row: Pick<TransactionListItem, "lockedFields" | "merchantName" | "name">
): string {
  const locked = (row.lockedFields ?? []) as string[];
  if (locked.includes("name")) {
    return row.name?.trim() || row.merchantName?.trim() || "";
  }
  return row.merchantName?.trim() || row.name?.trim() || "";
}

/** Sort key for date column — same hierarchy as horizon (`authorizedDate` || `date`). */
export function transactionDateSortKey(row: TransactionListItem): number {
  const raw = getTransactionDisplayDateString(row);
  const day = String(raw).split("T")[0] ?? String(raw);
  return new Date(`${day}T12:00:00.000Z`).getTime();
}

export function formatTransactionDateDisplay(
  row: Pick<TransactionListItem, "date">
): string {
  const raw = getTransactionDisplayDateString(row);
  const day = String(raw).split("T")[0] ?? String(raw);
  return dateDisplay.format(new Date(`${day}T12:00:00.000Z`));
}

const dateLong = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const dateShort = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

/** Short form for activity entries (e.g. "Mar 28, 2025"). */
export function formatDateStringShort(isoOrDay: string | null): string {
  if (!isoOrDay) {
    return "—";
  }
  const day = String(isoOrDay).split("T")[0] ?? String(isoOrDay);
  const t = new Date(`${day}T12:00:00.000Z`).getTime();
  if (Number.isNaN(t)) {
    return isoOrDay;
  }
  return dateShort.format(new Date(t));
}

/** Long form for detail views (e.g. "January 15, 2025"). */
export function formatDateStringLong(isoOrDay: string | null): string {
  if (!isoOrDay) {
    return "—";
  }
  const day = String(isoOrDay).split("T")[0] ?? String(isoOrDay);
  const t = new Date(`${day}T12:00:00.000Z`).getTime();
  if (Number.isNaN(t)) {
    return isoOrDay;
  }
  return dateLong.format(new Date(t));
}

/** `yearMonth` keys are calendar YYYY-MM from date strings; format in UTC so the label matches that month (avoids midnight UTC shifting to the prior local month). */
const monthGroupHeading = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

/**
 * Stable month bucket for grouping (calendar month of display date), e.g. `2025-03`.
 * Uses the same display date as {@link transactionDateSortKey}.
 */
export function transactionMonthGroupKey(
  row: Pick<TransactionListItem, "date">
): string {
  const raw = getTransactionDisplayDateString(row);
  const day = String(raw).split("T")[0] ?? String(raw);
  const parts = day.split("-");
  if (parts.length < 2) {
    return "unknown";
  }
  const [y, mo] = parts;
  const m = (mo ?? "01").padStart(2, "0");
  return `${y}-${m}`;
}

/** e.g. `2025-03` → "March 2025" */
export function formatMonthGroupLabel(yearMonth: string): string {
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

/** Horizon truncates account name at last letter before trailing digits; simplified cap at 20 chars. */
export function formatTransactionAccountDisplayName(
  accountName: string
): string {
  if (accountName.length <= 20) {
    return accountName;
  }
  let lastLetterIndex = -1;
  for (let i = accountName.length - 1; i >= 0; i -= 1) {
    const char = accountName[i];
    if (char !== undefined && /[a-zA-Z]/.test(char)) {
      lastLetterIndex = i;
      break;
    }
  }
  if (lastLetterIndex >= 0) {
    return accountName.slice(0, lastLetterIndex + 1);
  }
  return `${accountName.slice(0, 20)}…`;
}
