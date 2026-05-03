import { describe, expect, it } from "vitest";

import type { Binding } from "./bindings.js";
import { runUserCode } from "./code-runtime.js";

const fakeAccountsBinding = (rows: unknown): Binding => ({
  description: "fake",
  handler: () => Promise.resolve({ accounts: rows }),
  inputSchema: { properties: {}, type: "object" },
  name: "accounts_listAll",
});

const HAS_WORKER_URL = Boolean(process.env.SANDBOX_WORKER_URL);
// E2E test requires `wrangler dev` running locally and a deployed-or-local
// Worker URL set in env. Opt in explicitly with SANDBOX_WORKER_E2E=1 so the
// pre-commit hook doesn't try to hit a Worker that isn't running.
const RUN_E2E = process.env.SANDBOX_WORKER_E2E === "1";

describe("code-runtime (CF Worker sandbox)", () => {
  it("returns ConfigError when SANDBOX_WORKER_URL unset", async () => {
    if (HAS_WORKER_URL) {
      return;
    }
    const result = await runUserCode(
      [fakeAccountsBinding([])],
      `return await cobalt.accounts.listAll();`
    );
    expect(result.ok).toBeFalsy();
    expect(result.error?.name).toBe("ConfigError");
  });

  it.skipIf(!RUN_E2E)(
    "executes code via worker and returns logs + value",
    async () => {
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
    }
  );
});
