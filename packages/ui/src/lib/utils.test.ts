import { expect, describe, it } from "vitest";
import { cn } from "./utils.js";

describe(cn, () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
