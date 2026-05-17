import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { runCsvColumnMappingAgent } from "./csv-column-mapping-agent.js";
import type { CsvMappingAi } from "./csv-column-mapping-agent.js";

function mockModel(obj: unknown) {
  return new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        content: [{ text: JSON.stringify(obj), type: "text" as const }],
        finishReason: { raw: undefined, unified: "stop" as const },
        usage: {
          inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: 10, total: 10 },
          outputTokens: { reasoning: undefined, text: 10, total: 10 },
        },
        warnings: [],
      }),
  });
}

const baseRows = [{ Amount: "-5.75", Date: "2025-01-15", Description: "Starbucks" }];

const happyResponse: CsvMappingAi = {
  account: null,
  amount: {
    column: "Amount",
    kind: "signed",
    parensNegative: false,
    signConvention: "outflow_negative",
  },
  category: null,
  confidence: 0.95,
  date: { column: "Date", format: "yyyy-MM-dd", kind: "column" },
  excludeRule: null,
  merchant: { column: "Description" },
  notes: null,
  originalDescription: null,
  tags: null,
  transferRule: null,
};

describe("runCsvColumnMappingAgent", () => {
  it("happy path: maps canned response to CsvMapping (strips notTransactionData)", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Date", "Description", "Amount"],
      model: mockModel({ ...happyResponse, notTransactionData: false }),
      rows: baseRows,
    });
    expect(out.merchant.column).toBe("Description");
    expect(out.amount.kind).toBe("signed");
    expect((out as unknown as Record<string, unknown>).notTransactionData).toBeUndefined();
  });

  it("magnitude_type: emits debitValues + typeColumn", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Date", "Description", "Amount", "Type"],
      model: mockModel({
        ...happyResponse,
        amount: {
          debitValues: ["debit", "dr"],
          kind: "magnitude_type",
          magnitudeColumn: "Amount",
          typeColumn: "Type",
        },
      }),
      rows: [{ Amount: "5", Date: "01/01/2025", Description: "x", Type: "debit" }],
    });
    expect(out.amount).toMatchObject({ kind: "magnitude_type", typeColumn: "Type" });
  });

  it("signed + parensNegative", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Date", "Description", "Amount"],
      model: mockModel({
        ...happyResponse,
        amount: {
          column: "Amount",
          kind: "signed",
          parensNegative: true,
          signConvention: "outflow_negative",
        },
      }),
      rows: [{ Amount: "(5.00)", Date: "2025-01-01", Description: "x" }],
    });
    expect(out.amount).toMatchObject({ kind: "signed", parensNegative: true });
  });

  it("split inflow/outflow (YNAB)", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Date", "Payee", "Outflow", "Inflow"],
      model: mockModel({
        ...happyResponse,
        amount: { inflowColumn: "Inflow", kind: "split", outflowColumn: "Outflow" },
        merchant: { column: "Payee" },
      }),
      rows: [{ Date: "2025-01-01", Inflow: "0", Outflow: "5", Payee: "x" }],
    });
    expect(out.amount).toMatchObject({ kind: "split", outflowColumn: "Outflow" });
  });

  it("missing date column → date.kind = 'missing'", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Description", "Amount"],
      model: mockModel({ ...happyResponse, date: { kind: "missing" } }),
      rows: [{ Amount: "5", Description: "x" }],
    });
    expect(out.date).toStrictEqual({ kind: "missing" });
  });

  it("missing account → account null", async () => {
    const out = await runCsvColumnMappingAgent({
      headers: ["Date", "Description", "Amount"],
      model: mockModel({ ...happyResponse, account: null }),
      rows: baseRows,
    });
    expect(out.account).toBeNull();
  });

  it("schema-violation response surfaces as error", async () => {
    await expect(
      runCsvColumnMappingAgent({
        headers: ["Date", "Description", "Amount"],
        model: mockModel({ bogus: true }),
        rows: baseRows,
      }),
    ).rejects.toThrow(/.+/);
  });

  it("empty headers → throws without calling model", async () => {
    const m = mockModel(happyResponse);
    await expect(runCsvColumnMappingAgent({ headers: [], model: m, rows: [] })).rejects.toThrow(
      /no headers/i,
    );
    expect(m.doGenerateCalls).toHaveLength(0);
  });

  it("rejects unknown column not in headers", async () => {
    await expect(
      runCsvColumnMappingAgent({
        headers: ["Date", "Description", "Amount"],
        model: mockModel({
          ...happyResponse,
          merchant: { column: "NotARealColumn" },
        }),
        rows: baseRows,
      }),
    ).rejects.toThrow(/unknown column/i);
  });

  it("notTransactionData=true → throws", async () => {
    await expect(
      runCsvColumnMappingAgent({
        headers: ["Date", "Description", "Amount"],
        model: mockModel({ ...happyResponse, notTransactionData: true }),
        rows: baseRows,
      }),
    ).rejects.toThrow(/transactions export/i);
  });

  it("confidence < 0.6 → throws", async () => {
    await expect(
      runCsvColumnMappingAgent({
        headers: ["Date", "Description", "Amount"],
        model: mockModel({ ...happyResponse, confidence: 0.4 }),
        rows: baseRows,
      }),
    ).rejects.toThrow(/confidence/i);
  });

  // Cache-hit case is caller-level (csvMappingCache short-circuits before agent).
});
