export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/\b(inc|llc|corp|co|ltd|the)\b\.?/g, "")
    .replaceAll(/[^a-z0-9 ]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function cleanPhone(s: string | null | undefined): string | null {
  if (!s) {
    return null;
  }
  const digits = s.replaceAll(/\D/g, "");
  if (digits.length < 7) {
    return null;
  }
  return digits;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
