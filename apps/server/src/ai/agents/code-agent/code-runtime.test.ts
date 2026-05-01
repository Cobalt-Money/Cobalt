import { describe, expect, it } from "vitest";

import type { Binding } from "./bindings.js";
import { runUserCode } from "./code-runtime.js";

const fakeAccountsBinding = (rows: unknown): Binding => ({
  description: "fake",
  handler: () => Promise.resolve({ accounts: rows }),
  inputSchema: { properties: {}, type: "object" },
  name: "accounts_listAll",
});

describe("code-runtime (TanStack QuickJS)", () => {
  it("invokes a binding through the cobalt.* shim and returns logs + value", async () => {
    const bindings = [
      fakeAccountsBinding([
        { balance: 100, id: "a1", name: "Checking" },
        { balance: 500, id: "a2", name: "Savings" },
      ]),
    ];

    const code = `
      const res = await cobalt.accounts.listAll();
      console.log("count=" + res.accounts.length);
      return res.accounts.map(a => a.name);
    `;

    const result = await runUserCode(bindings, code);
    expect(result.ok).toBeTruthy();
    expect(result.stdout).toContain("count=2");
    expect(result.stdout).toContain("Checking");
    expect(result.stdout).toContain("Savings");
  });

  it("propagates binding errors", async () => {
    const bindings: Binding[] = [
      {
        description: "fake",
        handler: () => Promise.reject(new Error("boom")),
        inputSchema: { properties: {}, type: "object" },
        name: "accounts_listAll",
      },
    ];
    const result = await runUserCode(
      bindings,
      `await cobalt.accounts.listAll(); return "unreachable";`
    );
    expect(result.ok).toBeFalsy();
    expect(result.error?.message).toContain("boom");
  });
});
