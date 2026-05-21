import { describe, expect, it } from "vitest";

import { manualAccountCreateBodySchema, MANUAL_SUBTYPES_BY_TYPE } from "./schemas.js";

const base = {
  currentBalance: 100,
  name: "Test",
};

describe("manualAccountCreateBodySchema", () => {
  it("accepts a valid depository checking row", () => {
    const result = manualAccountCreateBodySchema.safeParse({
      ...base,
      subtype: "checking",
      type: "depository",
    });
    expect(result.success).toBeTruthy();
  });

  it("defaults currency to USD when omitted", () => {
    const result = manualAccountCreateBodySchema.parse({
      ...base,
      subtype: "savings",
      type: "depository",
    });
    expect(result.currency).toBe("USD");
  });

  it("rejects a subtype that does not belong to the chosen type", () => {
    const result = manualAccountCreateBodySchema.safeParse({
      ...base,
      subtype: "credit card",
      type: "depository",
    });
    expect(result.success).toBeFalsy();
    const issuePaths = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(issuePaths).toContain("subtype");
  });

  it("rejects Title-Case subtype (must be lowercase token)", () => {
    const result = manualAccountCreateBodySchema.safeParse({
      ...base,
      subtype: "Checking",
      type: "depository",
    });
    expect(result.success).toBeFalsy();
  });

  it("rejects creditLimit on a non-credit account", () => {
    const result = manualAccountCreateBodySchema.safeParse({
      ...base,
      creditLimit: 5000,
      subtype: "checking",
      type: "depository",
    });
    expect(result.success).toBeFalsy();
    const issuePaths = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(issuePaths).toContain("creditLimit");
  });

  it("accepts creditLimit on a credit account", () => {
    const result = manualAccountCreateBodySchema.safeParse({
      ...base,
      creditLimit: 5000,
      subtype: "credit card",
      type: "credit",
    });
    expect(result.success).toBeTruthy();
  });

  it("covers every subtype in MANUAL_SUBTYPES_BY_TYPE for its own type", () => {
    const failures: string[] = [];
    for (const [type, subtypes] of Object.entries(MANUAL_SUBTYPES_BY_TYPE)) {
      for (const subtype of subtypes) {
        const result = manualAccountCreateBodySchema.safeParse({
          ...base,
          subtype,
          type,
        });
        if (!result.success) {
          failures.push(`${type}/${subtype}`);
        }
      }
    }
    expect(failures).toStrictEqual([]);
  });
});
