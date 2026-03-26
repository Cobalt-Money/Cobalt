/** Pure date helper — extracts YYYY-MM-DD from a Date, ISO string, or date-only string. */
export const toDateString = (
  val: string | Date | null | undefined
): string | null => {
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

/** Pure timestamp helper — converts Date | string | null to ISO string or null. */
export const toISOString = (
  val: Date | string | null | undefined
): string | null => {
  if (!val) {
    return null;
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
};
