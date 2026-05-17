/**
 * Shared full-file CSV parser. Used by upload (sample capture) and
 * column-mapping confirm (re-parse from blob storage). Reuses Papa with
 * comma delimiter + greedy empty-line skip — must stay aligned with `gates.ts`
 * decode/parse path.
 */
export async function parseFullCsv(text: string): Promise<Record<string, string>[]> {
  const papaModule = await import("papaparse");
  const Papa = papaModule.default;
  // Strip a leading BOM so it doesn't glue onto the first header key (must match gates.ts).
  // 65279 = U+FEFF, in decimal (hex literals deadlock oxfmt vs the lint rule).
  const cleaned = text.codePointAt(0) === 65_279 ? text.slice(1) : text;
  const result = Papa.parse<Record<string, string>>(cleaned, {
    delimiter: ",",
    header: true,
    skipEmptyLines: "greedy",
  });
  return result.data.filter((r) => r && Object.values(r).some((v) => (v ?? "").trim() !== ""));
}
