/**
 * Shared full-file CSV parser. Used by upload (sample capture) and
 * column-mapping confirm (re-parse from blob storage). Reuses Papa with
 * comma delimiter + greedy empty-line skip — must stay aligned with `gates.ts`
 * decode/parse path.
 */
export async function parseFullCsv(text: string): Promise<Record<string, string>[]> {
  const papaModule = await import("papaparse");
  const Papa = papaModule.default;
  const result = Papa.parse<Record<string, string>>(text, {
    delimiter: ",",
    header: true,
    skipEmptyLines: "greedy",
  });
  return result.data.filter((r) => r && Object.values(r).some((v) => (v ?? "").trim() !== ""));
}
