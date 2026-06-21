import { describe, expect, it } from "vitest";

import { resolveSocialPostCategoryKey } from "./auto-share.js";

describe("resolveSocialPostCategoryKey", () => {
  it("prefers the resolved category row system key", () => {
    expect(resolveSocialPostCategoryKey("coffee_shop", "FOOD_AND_DRINK_GROCERIES")).toBe(
      "coffee_shop",
    );
  });

  it("falls back to Plaid PFC mapping when category row is missing", () => {
    expect(resolveSocialPostCategoryKey(null, "FOOD_AND_DRINK_COFFEE")).toBe("coffee_shop");
  });

  it("returns uncategorized for unmapped PFC", () => {
    expect(resolveSocialPostCategoryKey(null, null)).toBe("uncategorized");
  });
});
