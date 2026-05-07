import { describe, expect, it } from "vitest";

import { mintAdapter } from "./adapter";

const SAMPLE = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"01/15/2024","Starbucks","STARBUCKS #1234 SEATTLE WA","5.75","debit","Coffee Shops","Chase Sapphire","",""
"01/15/2024","Salary","ACME CORP DIRECT DEP","2500.00","credit","Paycheck","Chase Checking","",""
"01/16/2024","Transfer to Savings","TRANSFER","100.00","debit","Transfer","Chase Checking","",""
"01/16/2024","Transfer from Checking","TRANSFER","100.00","credit","Transfer","Chase Savings","",""
"01/17/2024","Whole Foods","WHOLEFDS #123","42.18","debit","Groceries","Chase Sapphire","food healthy",""
`;

describe("mintAdapter", () => {
  it("detects Mint header", () => {
    expect(mintAdapter.detect(SAMPLE)).toBeTruthy();
  });

  it("rejects non-Mint header", () => {
    expect(mintAdapter.detect("Date,Merchant,Amount\n2024-01-01,Foo,1.00")).toBeFalsy();
  });

  it("parses + normalizes signed amounts and dedupes within-file transfer pairs", async () => {
    const raw = await mintAdapter.parse({
      buffer: Buffer.from(SAMPLE),
      filename: "transactions.csv",
    });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });

    // 5 raw rows → 4 staged (one transfer credit collapsed)
    expect(staged).toHaveLength(4);

    const starbucks = staged.find((s) => s.merchant === "Starbucks");
    expect(starbucks?.amount).toBe(-5.75);
    expect(starbucks?.date).toBe("2024-01-15");

    const salary = staged.find((s) => s.merchant === "Salary");
    expect(salary?.amount).toBe(2500);

    // Transfer leg kept = the debit (outflow) one
    const transfer = staged.find((s) => s.isTransfer);
    expect(transfer?.amount).toBe(-100);
    expect(transfer?.sourceAccountName).toBe("Chase Checking");

    const groceries = staged.find((s) => s.merchant === "Whole Foods");
    expect(groceries?.tags).toStrictEqual(["food", "healthy"]);
  });

  it("extracts unique account + category names", async () => {
    const raw = await mintAdapter.parse({
      buffer: Buffer.from(SAMPLE),
      filename: "transactions.csv",
    });
    expect(mintAdapter.extractAccounts(raw).toSorted()).toStrictEqual([
      "Chase Checking",
      "Chase Sapphire",
      "Chase Savings",
    ]);
    expect(mintAdapter.extractCategories(raw).toSorted()).toStrictEqual([
      "Coffee Shops",
      "Groceries",
      "Paycheck",
      "Transfer",
    ]);
  });

  it("strips UTF-8 BOM prepended by Excel-roundtripped CSVs", async () => {
    const withBom = `﻿${SAMPLE}`;
    const raw = await mintAdapter.parse({
      buffer: Buffer.from(withBom),
      filename: "transactions.csv",
    });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    // If BOM weren't stripped, every Date would be undefined → 0 staged rows.
    expect(staged.length).toBeGreaterThan(0);
    expect(staged.find((s) => s.merchant === "Starbucks")?.date).toBe("2024-01-15");
  });

  it("parses single-digit M/d/yyyy dates", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"3/5/2024","Latte","COFFEE","4.50","debit","Coffee Shops","Card","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged[0]?.date).toBe("2024-03-05");
  });

  it("strips $ prefix and thousand separators from amounts", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"01/15/2024","Rent","RENT PAYMENT","$1,234.56","debit","Rent","Checking","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged[0]?.amount).toBe(-1234.56);
  });

  it("preserves newlines inside quoted Original Description", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"01/15/2024","ACH","WIRE FROM
ACME CORP","100.00","credit","Income","Checking","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged).toHaveLength(1);
    expect(staged[0]?.originalDescription).toContain("WIRE FROM");
    expect(staged[0]?.originalDescription).toContain("ACME CORP");
  });

  it("returns empty staged array for header-only file", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged).toStrictEqual([]);
  });

  it("skips rows with unparseable dates instead of failing whole file", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"01/15/2024","Good","ok","5.00","debit","Cat","Acct","",""
"not-a-date","Bad","oops","5.00","debit","Cat","Acct","",""
"01/17/2024","AlsoGood","ok","5.00","debit","Cat","Acct","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged).toHaveLength(2);
    expect(staged.map((s) => s.merchant).toSorted()).toStrictEqual(["AlsoGood", "Good"]);
  });

  it("handles real-world Mint-export row shape (single-digit month, dividend credit)", async () => {
    // Verbatim row shape from a real Mint export: M/dd/yyyy date, repeated
    // Description/Original Description, "credit" type with sub-dollar amount.
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"6/09/2020","DIVIDEND","DIVIDEND","0.01","credit","Investments","Regular Savings","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged).toHaveLength(1);
    expect(staged[0]).toMatchObject({
      amount: 0.01,
      date: "2020-06-09",
      isTransfer: false,
      merchant: "DIVIDEND",
      sourceAccountName: "Regular Savings",
      sourceCategoryName: "Investments",
    });
  });

  it("treats unknown Transaction Type as credit (positive)", async () => {
    const csv = `"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"
"01/15/2024","Mystery","x","10.00","unknown","Cat","Acct","",""
`;
    const raw = await mintAdapter.parse({ buffer: Buffer.from(csv), filename: "x.csv" });
    const staged = mintAdapter.normalize(raw, { userId: "u1" });
    expect(staged[0]?.amount).toBe(10);
  });
});
