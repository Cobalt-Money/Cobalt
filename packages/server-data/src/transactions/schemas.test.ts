import { z } from "zod";
import { describe, expect, it } from "vitest";

import { createTransactionSchema } from "./schemas.js";

const createTransactionsSchema = z.array(createTransactionSchema).min(1).max(500);

const validRow = {
  accountId: "11111111-1111-4111-8111-111111111111",
  amount: 12.5,
  date: "2026-05-19",
  name: "Lunch",
};

describe("createTransactionsSchema", () => {
  it("accepts a single-row array", () => {
    const result = createTransactionsSchema.safeParse([validRow]);
    expect(result.success).toBeTruthy();
  });

  it("rejects a bare object (must be wrapped in an array)", () => {
    const result = createTransactionsSchema.safeParse(validRow);
    expect(result.success).toBeFalsy();
  });

  it("rejects an empty array", () => {
    const result = createTransactionsSchema.safeParse([]);
    expect(result.success).toBeFalsy();
  });

  it("accepts up to 500 rows", () => {
    const rows = Array.from({ length: 500 }, () => validRow);
    const result = createTransactionsSchema.safeParse(rows);
    expect(result.success).toBeTruthy();
  });

  it("rejects more than 500 rows", () => {
    const rows = Array.from({ length: 501 }, () => validRow);
    const result = createTransactionsSchema.safeParse(rows);
    expect(result.success).toBeFalsy();
  });

  it("rejects malformed date format", () => {
    const result = createTransactionsSchema.safeParse([{ ...validRow, date: "May 19, 2026" }]);
    expect(result.success).toBeFalsy();
  });
});
