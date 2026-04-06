/**
 * Date-only utilities for business date handling.
 * All functions work with YYYY-MM-DD strings to avoid timezone shifts.
 */

export function extractDateFromISO(isoString: string): string {
  return isoString.slice(0, 10);
}

export function parseDateOnly(dateStr: string): Date {
  const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function compareDateOnly(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isDateInRange(
  date: string,
  start: string,
  end: string
): boolean {
  return date >= start && date <= end;
}

export function getTodayDateOnly(): string {
  return toDateOnlyString(new Date());
}

export function toDateOnlyStringSafe(
  value: Date | string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return toDateOnlyString(value);
  }
  const str = String(value).trim();
  if (!str) {
    return null;
  }
  return extractDateFromISO(str);
}
