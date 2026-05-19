import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { runCsvAccountMappingAgent } from "./csv-account-mapping-agent.js";

function mockModel(decisions: unknown[]) {
  // Schema requires every decision to commit to the nullable fields explicitly —
  // fixtures elide them for readability, so default to null here.
  const filled = decisions.map((d) =>
    typeof d === "object" && d !== null
      ? {
          newName: null,
          suggestedInstitutionDomain: null,
          suggestedInstitutionName: null,
          ...(d as Record<string, unknown>),
        }
      : d,
  );
  return new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        content: [{ text: JSON.stringify({ decisions: filled }), type: "text" as const }],
        finishReason: { raw: undefined, unified: "stop" as const },
        usage: {
          inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: 10, total: 10 },
          outputTokens: { reasoning: undefined, text: 10, total: 10 },
        },
        warnings: [],
      }),
  });
}

const userAccounts = [
  {
    customName: null,
    id: "acc_chase_chk",
    institutionName: "Chase",
    mask: "1234",
    name: "Chase Bank — Checking",
    officialName: "Chase Total Checking",
    subtype: "Checking",
    type: "depository",
  },
  {
    customName: null,
    id: "acc_amex",
    institutionName: "American Express",
    mask: "5678",
    name: "Amex Gold",
    officialName: "American Express Gold Card",
    subtype: "Credit Card",
    type: "credit",
  },
];

describe("runCsvAccountMappingAgent", () => {
  it("empty source labels → returns [] without calling model", async () => {
    const m = mockModel([]);
    const out = await runCsvAccountMappingAgent({
      model: m,
      sourceLabels: [],
      userAccounts,
    });
    expect(out).toStrictEqual([]);
    expect(m.doGenerateCalls).toHaveLength(0);
  });

  it("Path A exact match → action link to existing id", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.95,
          sourceLabel: "Chase Bank — Checking",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "acc_chase_chk",
        },
      ]),
      sourceLabels: ["Chase Bank — Checking"],
      userAccounts,
    });
    expect(out[0]).toMatchObject({ target: "acc_chase_chk" });
  });

  it("Path A fuzzy match", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.85,
          sourceLabel: "Chase Checking",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "acc_chase_chk",
        },
      ]),
      sourceLabels: ["Chase Checking"],
      userAccounts,
    });
    expect(out[0]?.target).toBe("acc_chase_chk");
  });

  it("Path A create depository", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.7,
          newName: "Local CU Checking",
          sourceLabel: "Local CU Checking",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "create_new",
        },
      ]),
      sourceLabels: ["Local CU Checking"],
      userAccounts,
    });
    expect(out[0]).toMatchObject({
      suggestedType: "depository",
      target: "create_new",
    });
  });

  it("Path A create credit", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.9,
          newName: "Amex Platinum",
          sourceLabel: "Amex Platinum",
          suggestedSubtype: "Credit Card",
          suggestedType: "credit",
          target: "create_new",
        },
      ]),
      sourceLabels: ["Amex Platinum"],
      userAccounts: [],
    });
    expect(out[0]).toMatchObject({
      suggestedSubtype: "Credit Card",
      suggestedType: "credit",
    });
  });

  it("Path A create investment", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.9,
          newName: "Fidelity Brokerage",
          sourceLabel: "Fidelity Brokerage",
          suggestedSubtype: "Brokerage",
          suggestedType: "investment",
          target: "create_new",
        },
      ]),
      sourceLabels: ["Fidelity Brokerage"],
      userAccounts: [],
    });
    expect(out[0]?.suggestedType).toBe("investment");
  });

  it("Path A create loan", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.85,
          newName: "Sallie Mae",
          sourceLabel: "Sallie Mae",
          suggestedSubtype: "Student Loan",
          suggestedType: "loan",
          target: "create_new",
        },
      ]),
      sourceLabels: ["Sallie Mae"],
      userAccounts: [],
    });
    expect(out[0]?.suggestedType).toBe("loan");
  });

  it("Path A skip junk", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.95,
          sourceLabel: "-",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "skip",
        },
      ]),
      sourceLabels: ["-"],
      userAccounts,
    });
    expect(out[0]?.target).toBe("skip");
  });

  it("mixed batch link + create + skip", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.95,
          sourceLabel: "Chase Bank — Checking",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "acc_chase_chk",
        },
        {
          confidence: 0.85,
          newName: "Wealthfront",
          sourceLabel: "Wealthfront",
          suggestedSubtype: "Brokerage",
          suggestedType: "investment",
          target: "create_new",
        },
        {
          confidence: 1,
          sourceLabel: "",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "skip",
        },
      ]),
      sourceLabels: ["Chase Bank — Checking", "Wealthfront", ""],
      userAccounts,
    });
    expect(out.map((d) => d.target)).toStrictEqual(["acc_chase_chk", "create_new", "skip"]);
  });

  it("empty existingAccounts → schema accepts create/skip", async () => {
    const out = await runCsvAccountMappingAgent({
      model: mockModel([
        {
          confidence: 0.85,
          newName: "Chase Checking",
          sourceLabel: "Chase Checking",
          suggestedSubtype: "Checking",
          suggestedType: "depository",
          target: "create_new",
        },
      ]),
      sourceLabels: ["Chase Checking"],
      userAccounts: [],
    });
    expect(out[0]?.target).toBe("create_new");
  });

  it("schema-violation: invented account id rejected", async () => {
    await expect(
      runCsvAccountMappingAgent({
        model: mockModel([
          {
            confidence: 0.9,
            sourceLabel: "Chase Checking",
            suggestedSubtype: "Checking",
            suggestedType: "depository",
            target: "acc_does_not_exist",
          },
        ]),
        sourceLabels: ["Chase Checking"],
        userAccounts,
      }),
    ).rejects.toThrow(/.+/);
  });

  it("schema-violation: malformed response", async () => {
    await expect(
      runCsvAccountMappingAgent({
        model: mockModel([{ wrong: "shape" }]),
        sourceLabels: ["Chase Checking"],
        userAccounts,
      }),
    ).rejects.toThrow(/.+/);
  });

  // Cache-hit case is caller-level (accountMappingCache short-circuits).
});
