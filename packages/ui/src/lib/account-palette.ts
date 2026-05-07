/**
 * Canonical color palette for account category buckets used in net-worth
 * charts, allocation donuts, and category legends. Shared across dashboard
 * and landing demos so the visual category language is consistent.
 */
export const ACCOUNT_CATEGORY_COLORS = {
  checking: "#3b82f6",
  credit: "#ec4899",
  investments: "#38bdf8",
  loans: "#f97316",
  savings: "#6366f1",
} as const;

export type AccountCategory = keyof typeof ACCOUNT_CATEGORY_COLORS;
