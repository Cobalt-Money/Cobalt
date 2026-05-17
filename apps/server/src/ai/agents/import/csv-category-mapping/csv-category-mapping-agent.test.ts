import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { runCsvCategoryMappingAgent } from "./csv-category-mapping-agent.js";

function mockModel(decisionsPerCall: unknown[][]) {
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: () => {
      const decisions = decisionsPerCall[i] ?? decisionsPerCall.at(-1);
      i += 1;
      return Promise.resolve({
        content: [{ text: JSON.stringify({ decisions }), type: "text" as const }],
        finishReason: { raw: undefined, unified: "stop" as const },
        usage: {
          inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: 10, total: 10 },
          outputTokens: { reasoning: undefined, text: 10, total: 10 },
        },
        warnings: [],
      });
    },
  });
}

const userCategories = [
  { id: "cat_food", name: "Food", systemKey: "food" },
  { id: "cat_restaurants", name: "Restaurants", systemKey: "restaurants" },
  { id: "cat_groceries", name: "Groceries", systemKey: "groceries" },
];

describe("runCsvCategoryMappingAgent", () => {
  it("action=link exact match", async () => {
    const out = await runCsvCategoryMappingAgent({
      model: mockModel([
        [
          {
            action: "link",
            confidence: 0.95,
            sourceLabel: "Groceries",
            targetCategoryId: "cat_groceries",
          },
        ],
      ]),
      sourceLabels: ["Groceries"],
      userCategories,
    });
    expect(out[0]).toMatchObject({ action: "link", targetCategoryId: "cat_groceries" });
  });

  it("action=skip when no fit", async () => {
    const out = await runCsvCategoryMappingAgent({
      model: mockModel([
        [
          {
            action: "skip",
            confidence: 0.5,
            sourceLabel: "Crypto Staking",
            targetCategoryId: "__none__",
          },
        ],
      ]),
      sourceLabels: ["Crypto Staking"],
      userCategories,
    });
    expect(out[0]).toMatchObject({ action: "skip", targetCategoryId: null });
  });

  it("action=skip for meaningless label", async () => {
    const out = await runCsvCategoryMappingAgent({
      model: mockModel([
        [
          {
            action: "skip",
            confidence: 0.95,
            sourceLabel: "--",
            targetCategoryId: "__none__",
          },
        ],
      ]),
      sourceLabels: ["--"],
      userCategories,
    });
    expect(out[0]).toMatchObject({ action: "skip", targetCategoryId: null });
  });

  it("mixed batch link + skip", async () => {
    const out = await runCsvCategoryMappingAgent({
      model: mockModel([
        [
          {
            action: "link",
            confidence: 0.95,
            sourceLabel: "Groceries",
            targetCategoryId: "cat_groceries",
          },
          {
            action: "skip",
            confidence: 0.5,
            sourceLabel: "Crypto Staking",
            targetCategoryId: "__none__",
          },
          {
            action: "skip",
            confidence: 0.95,
            sourceLabel: "--",
            targetCategoryId: "__none__",
          },
        ],
      ]),
      sourceLabels: ["Groceries", "Crypto Staking", "--"],
      userCategories,
    });
    expect(out.map((d) => d.action)).toStrictEqual(["link", "skip", "skip"]);
  });

  it("empty userCategories → schema admits __none__ for skip", async () => {
    const out = await runCsvCategoryMappingAgent({
      model: mockModel([
        [
          {
            action: "skip",
            confidence: 0.5,
            sourceLabel: "Food",
            targetCategoryId: "__none__",
          },
        ],
      ]),
      sourceLabels: ["Food"],
      userCategories: [],
    });
    expect(out[0]?.action).toBe("skip");
  });

  it(">20 labels → batches (BATCH_SIZE=12), each batch sees full category list", async () => {
    const labels = Array.from({ length: 30 }, (_, i) => `Label${i}`);
    const decisionsBatchA = labels.slice(0, 12).map((l) => ({
      action: "skip",
      confidence: 0.5,
      sourceLabel: l,
      targetCategoryId: "__none__",
    }));
    const decisionsBatchB = labels.slice(12, 24).map((l) => ({
      action: "skip",
      confidence: 0.5,
      sourceLabel: l,
      targetCategoryId: "__none__",
    }));
    const decisionsBatchC = labels.slice(24, 30).map((l) => ({
      action: "skip",
      confidence: 0.5,
      sourceLabel: l,
      targetCategoryId: "__none__",
    }));
    const m = mockModel([decisionsBatchA, decisionsBatchB, decisionsBatchC]);
    const out = await runCsvCategoryMappingAgent({
      model: m,
      sourceLabels: labels,
      userCategories,
    });
    expect(out).toHaveLength(30);
    expect(m.doGenerateCalls).toHaveLength(3);
  });

  it("schema refine: action=link with __none__ targetCategoryId rejected", async () => {
    await expect(
      runCsvCategoryMappingAgent({
        model: mockModel([
          [
            {
              action: "link",
              confidence: 0.9,
              sourceLabel: "Groceries",
              targetCategoryId: "__none__",
            },
          ],
        ]),
        sourceLabels: ["Groceries"],
        userCategories,
      }),
    ).rejects.toThrow(/.+/);
  });

  it("schema-violation: malformed response", async () => {
    await expect(
      runCsvCategoryMappingAgent({
        model: mockModel([[{ wrong: "shape" }]]),
        sourceLabels: ["Groceries"],
        userCategories,
      }),
    ).rejects.toThrow(/.+/);
  });

  it("output truncation (finishReason=length) surfaces error", async () => {
    const m = new MockLanguageModelV3({
      doGenerate: () =>
        Promise.resolve({
          content: [{ text: '{"decisions":[', type: "text" as const }],
          finishReason: { raw: undefined, unified: "length" as const },
          usage: {
            inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: 10, total: 10 },
            outputTokens: { reasoning: undefined, text: 10, total: 10 },
          },
          warnings: [],
        }),
    });
    await expect(
      runCsvCategoryMappingAgent({
        model: m,
        sourceLabels: ["Groceries"],
        userCategories,
      }),
    ).rejects.toThrow(/.+/);
  });

  // Cache-hit case is caller-level (categoryMappingCache strips cached labels).
});
