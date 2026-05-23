import { describe, expect, it } from "vitest";

import { ImportGateError, headerSignature, runGates } from "./gates";

const goodCsv = "Date,Description,Amount\n2026-01-01,Coffee,-4.50\n2026-01-02,Salary,1000\n";

describe("runGates", () => {
  it("accepts a small clean CSV", () => {
    const result = runGates(Buffer.from(goodCsv, "utf-8"), "mint.csv");
    expect(result.headers).toStrictEqual(["Date", "Description", "Amount"]);
    expect(result.totalRows).toBe(2);
    expect(result.fileHash).toMatch(/^[\da-f]{64}$/);
  });

  it("rejects non-CSV extension", () => {
    expect(() => runGates(Buffer.from(goodCsv), "mint.xlsx")).toThrow(ImportGateError);
  });

  it("rejects xlsx magic bytes", () => {
    const buf = Buffer.from([80, 75, 3, 4, 0, 0, 0, 0]);
    expect(() => runGates(buf, "mint.csv")).toThrow(/xlsx/);
  });

  it("rejects PDF magic bytes", () => {
    const buf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20)]);
    expect(() => runGates(buf, "mint.csv")).toThrow(/pdf/);
  });

  it("rejects semicolon-separated files", () => {
    const csv = "Date;Description;Amount\n2026-01-01;Coffee;-4.50\n";
    expect(() => runGates(Buffer.from(csv), "mint.csv")).toThrow(/comma-separated/);
  });

  it("rejects header-only files", () => {
    expect(() => runGates(Buffer.from("Date,Description,Amount\n"), "mint.csv")).toThrow(
      /header row and one data row/,
    );
  });

  it("rejects fewer than 3 named header columns", () => {
    expect(() => runGates(Buffer.from("a,b\n1,2\n"), "mint.csv")).toThrow(/3 named columns/);
  });
});

describe("headerSignature", () => {
  it("is order-insensitive and case-insensitive", () => {
    const a = headerSignature(["Date", "Amount", "Description"]);
    const b = headerSignature(["amount", "DESCRIPTION", "date"]);
    expect(a).toBe(b);
  });

  it("differs across distinct header sets", () => {
    expect(headerSignature(["a", "b"])).not.toBe(headerSignature(["a", "c"]));
  });
});
