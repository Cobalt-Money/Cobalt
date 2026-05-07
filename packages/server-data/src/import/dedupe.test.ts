import { describe, expect, it } from "vitest";

import { findDedupeMatch } from "./dedupe";

describe("findDedupeMatch", () => {
  const pool = [
    { amount: -5.75, date: "2024-01-15", id: "txn-1", merchant: "Starbucks" },
    { amount: -42.18, date: "2024-01-17", id: "txn-2", merchant: "Whole Foods Market" },
  ];

  it("matches on exact merchant, amount, date", () => {
    expect(
      findDedupeMatch({ amount: -5.75, date: "2024-01-15", merchant: "Starbucks" }, pool),
    ).toBe("txn-1");
  });

  it("matches within ±3 day drift", () => {
    expect(
      findDedupeMatch({ amount: -5.75, date: "2024-01-13", merchant: "Starbucks" }, pool),
    ).toBe("txn-1");
  });

  it("rejects beyond 3 day drift", () => {
    expect(
      findDedupeMatch({ amount: -5.75, date: "2024-01-20", merchant: "Starbucks" }, pool),
    ).toBeNull();
  });

  it("rejects when signs differ (refund vs charge)", () => {
    expect(
      findDedupeMatch({ amount: 5.75, date: "2024-01-15", merchant: "Starbucks" }, pool),
    ).toBeNull();
  });

  it("matches on close merchant fuzz (typo)", () => {
    expect(findDedupeMatch({ amount: -5.75, date: "2024-01-15", merchant: "Starbukc" }, pool)).toBe(
      "txn-1",
    );
  });

  it("rejects merchant edit distance ≥ 3", () => {
    expect(
      findDedupeMatch({ amount: -42.18, date: "2024-01-17", merchant: "Trader Joes" }, pool),
    ).toBeNull();
  });
});
