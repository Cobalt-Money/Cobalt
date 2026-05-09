import type { CsvMapping } from "@cobalt-web/db/schema/imports/import-job";
import { describe, expect, it } from "vitest";

import { parseRows } from "./parse-rows";

const baseMapping: CsvMapping = {
  account: { column: "Account" },
  amount: {
    column: "Amount",
    kind: "signed",
    parensNegative: true,
    signConvention: "outflow_negative",
  },
  category: { column: "Category" },
  confidence: 0.95,
  date: { column: "Date", format: "yyyy-MM-dd", kind: "column" },
  excludeRule: null,
  merchant: { column: "Description" },
  notes: null,
  originalDescription: null,
  tags: null,
  transferRule: null,
};

describe("parseRows", () => {
  it("parses a clean row", () => {
    const { staged, rejected } = parseRows({
      defaultAccountName: "fallback",
      mapping: baseMapping,
      rows: [
        {
          Account: "Chase",
          Amount: "-4.50",
          Category: "Food",
          Date: "2026-01-01",
          Description: "Coffee",
        },
      ],
    });
    expect(rejected).toStrictEqual([]);
    expect(staged[0]).toMatchObject({
      amount: -4.5,
      date: "2026-01-01",
      merchant: "Coffee",
      sourceAccountName: "Chase",
      sourceCategoryName: "Food",
    });
  });

  it("rejects empty date", () => {
    const { rejected } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows: [{ Account: "Chase", Amount: "1", Category: "Food", Date: "", Description: "x" }],
    });
    expect(rejected[0]?.reason).toMatch(/Date/);
  });

  it("flips sign when convention is outflow_positive", () => {
    const m: CsvMapping = {
      ...baseMapping,
      amount: {
        column: "Amount",
        kind: "signed",
        parensNegative: false,
        signConvention: "outflow_positive",
      },
    };
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: m,
      rows: [
        { Account: "Chase", Amount: "10", Category: "", Date: "2026-01-01", Description: "x" },
      ],
    });
    expect(staged[0]?.amount).toBe(-10);
  });

  it("handles parens-as-negative", () => {
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: baseMapping,
      rows: [
        { Account: "Chase", Amount: "(10.50)", Category: "", Date: "2026-01-01", Description: "x" },
      ],
    });
    expect(staged[0]?.amount).toBe(-10.5);
  });

  it("handles split debit/credit columns", () => {
    const m: CsvMapping = {
      ...baseMapping,
      amount: { inflowColumn: "Credit", kind: "split", outflowColumn: "Debit" },
    };
    const { staged } = parseRows({
      defaultAccountName: "x",
      mapping: m,
      rows: [
        {
          Account: "Chase",
          Category: "",
          Credit: "0",
          Date: "2026-01-01",
          Debit: "5",
          Description: "x",
        },
        {
          Account: "Chase",
          Category: "",
          Credit: "20",
          Date: "2026-01-01",
          Debit: "0",
          Description: "y",
        },
      ],
    });
    expect(staged[0]?.amount).toBe(-5);
    expect(staged[1]?.amount).toBe(20);
  });

  it("uses defaultAccountName when account column is null", () => {
    const m: CsvMapping = { ...baseMapping, account: null };
    const { staged } = parseRows({
      defaultAccountName: "Single Account",
      mapping: m,
      rows: [{ Amount: "1", Category: "", Date: "2026-01-01", Description: "x" }],
    });
    expect(staged[0]?.sourceAccountName).toBe("Single Account");
  });
});
