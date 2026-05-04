export const toDateString = (val: string | Date | null | undefined): string | null => {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0] ?? null;
  }
  if (typeof val === "string" && val.includes("T")) {
    return val.split("T")[0] ?? null;
  }
  return val;
};

/** Drizzle `date` strings, JS `Date`, or Zero-replicated epoch ms → `YYYY-MM-DD`. */
export const normalizeDateForTransactionList = (
  val: string | Date | number | null | undefined,
): string | null => {
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === "number") {
    return new Date(val).toISOString().split("T")[0] ?? null;
  }
  return toDateString(val);
};
