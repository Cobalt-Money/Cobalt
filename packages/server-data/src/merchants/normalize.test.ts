import { describe, expect, it } from "vitest";

import { normalizeMerchantName, stripLocationTokens } from "./normalize";

describe("normalizeMerchantName", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeMerchantName("McDonald's!")).toBe("mcdonald s");
  });

  it("strips trailing store numbers (with optional hash + attached letter)", () => {
    expect(normalizeMerchantName("STARBUCKS #4823")).toBe("starbucks");
    expect(normalizeMerchantName("7-Eleven Store 11178")).toBe("7 eleven store");
    expect(normalizeMerchantName("7-Eleven #11178a")).toBe("7 eleven");
    expect(normalizeMerchantName("Walgreens 4565")).toBe("walgreens");
  });

  it("strips business suffixes", () => {
    expect(normalizeMerchantName("Glassell Coffee Shop LLC")).toBe("glassell coffee shop");
    expect(normalizeMerchantName("ACME Inc.")).toBe("acme");
  });

  it("collapses whitespace", () => {
    expect(normalizeMerchantName("Russ   &   Daughters")).toBe("russ daughters");
  });
});

describe("stripLocationTokens", () => {
  it("removes Plaid city + region words from the name", () => {
    expect(stripLocationTokens("STARBUCKS NEW YORK NY", "New York", "NY")).toBe("STARBUCKS");
  });

  it("is a no-op when tokens not present", () => {
    expect(stripLocationTokens("STARBUCKS", "Brooklyn", "NY")).toBe("STARBUCKS");
  });

  it("handles null inputs", () => {
    expect(stripLocationTokens("STARBUCKS", null, null)).toBe("STARBUCKS");
  });
});
