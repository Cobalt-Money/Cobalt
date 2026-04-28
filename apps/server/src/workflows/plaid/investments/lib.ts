export const INVESTMENT_TRANSACTIONS_PAGE_SIZE = 500;

const DAYS_OF_HISTORY = 720;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): string {
  return date.toISOString().split("T").at(0) ?? "";
}

/** Compute the 2-year lookback range for investment transaction history. */
export function computeInvestmentTransactionsDateRange(): {
  startDate: string;
  endDate: string;
} {
  const now = Date.now();
  return {
    endDate: toDateOnly(new Date(now)),
    startDate: toDateOnly(new Date(now - DAYS_OF_HISTORY * MS_PER_DAY)),
  };
}
