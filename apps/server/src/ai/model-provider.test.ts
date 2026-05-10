import { describe, expect, it } from "vitest";

import { getProviderOptions, parseModelWithReasoning } from "./model-provider.js";

describe("parseModelWithReasoning", () => {
  describe("happy path", () => {
    it("strips a single +reasoning suffix", () => {
      expect(parseModelWithReasoning("anthropic/claude-opus-4.7+reasoning")).toStrictEqual({
        baseModel: "anthropic/claude-opus-4.7",
        useReasoning: true,
      });
    });

    it("returns model unchanged when no suffix", () => {
      expect(parseModelWithReasoning("anthropic/claude-opus-4.7")).toStrictEqual({
        baseModel: "anthropic/claude-opus-4.7",
        useReasoning: false,
      });
    });

    it("strips repeated +reasoning suffixes", () => {
      expect(
        parseModelWithReasoning("anthropic/claude-opus-4.7+reasoning+reasoning"),
      ).toStrictEqual({
        baseModel: "anthropic/claude-opus-4.7",
        useReasoning: true,
      });
    });
  });

  describe("edge cases", () => {
    it("does not match +reasoning in the middle of the id", () => {
      expect(parseModelWithReasoning("anthropic/+reasoning-model")).toStrictEqual({
        baseModel: "anthropic/+reasoning-model",
        useReasoning: false,
      });
    });

    it("preserves non-anthropic providers", () => {
      expect(parseModelWithReasoning("openai/gpt-5.2+reasoning")).toStrictEqual({
        baseModel: "openai/gpt-5.2",
        useReasoning: true,
      });
    });
  });
});

describe("getProviderOptions", () => {
  describe("reasoning disabled", () => {
    it("returns undefined when useReasoning is false", () => {
      expect(getProviderOptions("anthropic/claude-opus-4.7", false)).toBeUndefined();
    });
  });

  describe("adaptive Claude (4.6+)", () => {
    it("returns adaptive thinking for opus-4.6", () => {
      expect(getProviderOptions("anthropic/claude-opus-4.6", true)).toStrictEqual({
        anthropic: { effort: "high", thinking: { type: "adaptive" } },
      });
    });

    it("returns adaptive thinking for sonnet-4.7", () => {
      expect(getProviderOptions("anthropic/claude-sonnet-4.7", true)).toStrictEqual({
        anthropic: { effort: "high", thinking: { type: "adaptive" } },
      });
    });

    it("uses provided effort level", () => {
      expect(getProviderOptions("anthropic/claude-opus-4.7", true, "low")).toStrictEqual({
        anthropic: { effort: "low", thinking: { type: "adaptive" } },
      });
    });
  });

  describe("budget Claude (older)", () => {
    it("returns fixed budget for claude-opus-4", () => {
      expect(getProviderOptions("anthropic/claude-opus-4", true)).toStrictEqual({
        anthropic: { thinking: { budgetTokens: 12_000, type: "enabled" } },
      });
    });

    it("returns fixed budget for claude-3-7-sonnet", () => {
      expect(getProviderOptions("anthropic/claude-3-7-sonnet", true)).toStrictEqual({
        anthropic: { thinking: { budgetTokens: 12_000, type: "enabled" } },
      });
    });
  });

  describe("unsupported models", () => {
    it("returns undefined for non-anthropic models even with reasoning", () => {
      expect(getProviderOptions("openai/gpt-5.2", true)).toBeUndefined();
    });

    it("returns undefined for unknown anthropic models", () => {
      expect(getProviderOptions("anthropic/claude-haiku-3", true)).toBeUndefined();
    });
  });
});
