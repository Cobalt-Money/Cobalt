import { describe, expect, it } from "vitest";

import { parseFullCsv } from "./parse-csv";

describe("parseFullCsv", () => {
  it("parses header + rows into Record<string,string>[]", async () => {
    const text = "Date,Amount,Description\n2026-01-01,-4.50,Coffee\n2026-01-02,-12.00,Lunch\n";
    const rows = await parseFullCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toStrictEqual({ Amount: "-4.50", Date: "2026-01-01", Description: "Coffee" });
    expect(rows[1]).toStrictEqual({ Amount: "-12.00", Date: "2026-01-02", Description: "Lunch" });
  });

  it("skips blank rows", async () => {
    const text = "A,B\n1,2\n\n   \n3,4\n";
    const rows = await parseFullCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toStrictEqual({ A: "1", B: "2" });
    expect(rows[1]).toStrictEqual({ A: "3", B: "4" });
  });

  it("returns empty array for header-only file", async () => {
    const rows = await parseFullCsv("Date,Amount\n");
    expect(rows).toStrictEqual([]);
  });

  it("preserves quoted commas inside cells", async () => {
    const text = 'Name,Note\n"Smith, John","hello, world"\n';
    const rows = await parseFullCsv(text);
    expect(rows[0]).toStrictEqual({ Name: "Smith, John", Note: "hello, world" });
  });
});
