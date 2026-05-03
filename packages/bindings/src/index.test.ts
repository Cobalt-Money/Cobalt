import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  bindRoutes,
  bindingsToToolMap,
  buildShim,
  route,
  runWithBindings,
} from "./index.js";

describe("buildShim", () => {
  it("groups <group>_<method> names under a root namespace", () => {
    const shim = buildShim([
      "accounts_listAll",
      "accounts_getById",
      "tags_list",
    ]);
    expect(shim).toContain("const cobalt = {");
    expect(shim).toContain("accounts:");
    expect(shim).toContain("tags:");
    expect(shim).toContain("listAll: async (input)");
    expect(shim).toContain("getById: async (input)");
  });

  it("ignores names without an underscore", () => {
    const shim = buildShim(["topLevel", "ok_method"]);
    expect(shim).not.toContain("topLevel");
    expect(shim).toContain("ok:");
  });

  it("supports a custom root name", () => {
    const shim = buildShim(["foo_bar"], "myroot");
    expect(shim).toContain("const myroot = {");
  });
});

describe("bindRoutes", () => {
  it("captures userId in handler closure and validates args via zod", async () => {
    const captured: { userId?: string; args?: unknown } = {};
    const routes = [
      route({
        description: "test",
        handler: (userId, args) => {
          captured.userId = userId;
          captured.args = args;
          return Promise.resolve({ ok: true });
        },
        name: "things_do",
        schema: z.object({ id: z.string().min(1) }),
      }),
    ];
    const bindings = bindRoutes("user-123", routes);
    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.name).toBe("things_do");

    const result = await bindings[0]?.handler({ id: "abc" });
    expect(result).toStrictEqual({ ok: true });
    expect(captured.userId).toBe("user-123");
    expect(captured.args).toStrictEqual({ id: "abc" });
  });

  it("rejects invalid args via the route's zod schema", async () => {
    const routes = [
      route({
        description: "x",
        handler: () => Promise.resolve("ok"),
        name: "x_y",
        schema: z.object({ id: z.string().min(1) }),
      }),
    ];
    const [b] = bindRoutes("u", routes);
    await expect(b?.handler({})).rejects.toThrow(/id/);
  });
});

describe("bindingsToToolMap", () => {
  it("wraps handlers with safeStringify (BigInt + Date)", async () => {
    const bindings = [
      {
        description: "d",
        handler: () => Promise.resolve({ big: 10n, when: new Date(0) }),
        inputSchema: { type: "object" } as Record<string, unknown>,
        name: "x_y",
      },
    ];
    const map = bindingsToToolMap(bindings);
    const out = await map.x_y?.execute({});
    expect(out).toContain('"big": "10"');
    expect(out).toContain('"when": "1970-01-01T00:00:00.000Z"');
  });
});

describe("runWithBindings", () => {
  it("returns ConfigError when driver is null", async () => {
    const result = await runWithBindings([], "return 1;", { driver: null });
    expect(result.ok).toBeFalsy();
    expect(result.error?.name).toBe("ConfigError");
  });

  it("composes shim + user code and forwards to the driver", async () => {
    let receivedCode = "";
    let receivedBindings: Record<string, unknown> = {};
    const driver = {
      createContext: (opts: {
        bindings: Record<string, unknown>;
        timeout?: number;
      }) => {
        receivedBindings = opts.bindings;
        return Promise.resolve({
          dispose: () => Promise.resolve(),
          execute: (code: string) => {
            receivedCode = code;
            return Promise.resolve({
              logs: ["log line"],
              success: true,
              value: { hello: 1 },
            });
          },
        });
      },
    };
    const bindings = [
      {
        description: "d",
        handler: () => Promise.resolve({}),
        inputSchema: { type: "object" } as Record<string, unknown>,
        name: "accounts_listAll",
      },
    ];
    const result = await runWithBindings(
      bindings,
      "return cobalt.accounts.listAll();",
      { driver }
    );
    expect(result.ok).toBeTruthy();
    expect(receivedCode).toContain("const cobalt =");
    expect(receivedCode).toContain("accounts: {");
    expect(receivedCode).toContain("return cobalt.accounts.listAll();");
    expect(receivedBindings.accounts_listAll).toBeDefined();
    expect(result.stdout).toContain("log line");
    expect(result.stdout).toContain('"hello": 1');
  });
});
