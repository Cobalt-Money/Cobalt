import { describe, expect, it, vi } from "vitest";

vi.mock(import("nitro/storage"), (() => ({
  useStorage: () => ({
    getItem: () => Promise.resolve(null),
    getKeys: () => Promise.resolve([]),
  }),
})) as never);

const { extractTableNames } = await import("./schema-context.js");

describe("extractTableNames", () => {
  it("extracts a single pgTable name", () => {
    const src = `export const accounts = pgTable("accounts", { id: text() })`;
    expect(extractTableNames(src)).toStrictEqual(["accounts"]);
  });

  it("extracts multiple pgTable names from one file", () => {
    const src = `
      export const a = pgTable("accounts_a", {});
      export const b = pgTable("accounts_b", {});
      export const c = pgTable("accounts_c", {});
    `;
    expect(extractTableNames(src)).toStrictEqual(["accounts_a", "accounts_b", "accounts_c"]);
  });

  it("accepts single quotes", () => {
    expect(extractTableNames(`pgTable('users', {})`)).toStrictEqual(["users"]);
  });

  it("tolerates whitespace between pgTable and (", () => {
    expect(extractTableNames(`pgTable  (  "users"  , {})`)).toStrictEqual(["users"]);
  });

  it("returns empty array when no pgTable calls", () => {
    expect(extractTableNames("export const x = 1")).toStrictEqual([]);
  });

  it("ignores other function calls", () => {
    expect(extractTableNames(`mysqlTable("not_pg", {})`)).toStrictEqual([]);
  });

  it("returns empty array on empty input", () => {
    expect(extractTableNames("")).toStrictEqual([]);
  });
});
