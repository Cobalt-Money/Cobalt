import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Date shown in the table: `authorizedDate` when present, else `date` (matches horizon). */
export function getTransactionDisplayDateString(
  row: Pick<TransactionListItem, "authorizedDate" | "date">
): string {
  return row.authorizedDate ?? row.date;
}

/** Sort key for date column — same hierarchy as horizon (`authorizedDate` || `date`). */
export function transactionDateSortKey(row: TransactionListItem): number {
  const raw = getTransactionDisplayDateString(row);
  const day = String(raw).split("T")[0] ?? String(raw);
  return new Date(`${day}T12:00:00.000Z`).getTime();
}

export function formatTransactionDateDisplay(
  row: Pick<TransactionListItem, "authorizedDate" | "date">
): string {
  const raw = getTransactionDisplayDateString(row);
  const day = String(raw).split("T")[0] ?? String(raw);
  return dateDisplay.format(new Date(`${day}T12:00:00.000Z`));
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
    if (/[a-zA-Z]/.test(char)) {
      lastLetterIndex = i;
      break;
    }
  }
  if (lastLetterIndex >= 0) {
    return accountName.slice(0, lastLetterIndex + 1);
  }
  return `${accountName.slice(0, 20)}…`;
}
