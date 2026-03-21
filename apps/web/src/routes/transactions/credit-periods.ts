export const CREDIT_SPENDING_PERIODS = [
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "all",
] as const;

export type CreditSpendingPeriod = (typeof CREDIT_SPENDING_PERIODS)[number];
