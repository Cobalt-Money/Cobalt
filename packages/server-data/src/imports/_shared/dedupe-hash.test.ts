import { describe, expect, it } from "vitest";

import { hashImportRow } from "./dedupe-hash";

describe("hashImportRow", () => {
  it("is stable across whitespace + case in merchant", () => {
    const a = hashImportRow({
      accountId: "acct-1",
      amountCents: -450,
      date: "2026-01-01",
      merchant: "Starbucks",
    });
    const b = hashImportRow({
      accountId: "acct-1",
      amountCents: -450,
      date: "2026-01-01",
      merchant: "  starbucks  ",
    });
    expect(a).toBe(b);
  });

  it("differs when amount differs", () => {
    const a = hashImportRow({
      accountId: "acct-1",
      amountCents: 1,
      date: "2026-01-01",
      merchant: "x",
    });
    const b = hashImportRow({
      accountId: "acct-1",
      amountCents: 2,
      date: "2026-01-01",
      merchant: "x",
    });
    expect(a).not.toBe(b);
  });

  it("differs when account differs", () => {
    const a = hashImportRow({ accountId: "a", amountCents: 1, date: "2026-01-01", merchant: "x" });
    const b = hashImportRow({ accountId: "b", amountCents: 1, date: "2026-01-01", merchant: "x" });
    expect(a).not.toBe(b);
  });
});
