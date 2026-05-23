/** Convert nullable string (DB numeric) → number | null. */
export function numOrNull(v: string | null | undefined): number | null {
  return v === null || v === undefined ? null : Number(v);
}
