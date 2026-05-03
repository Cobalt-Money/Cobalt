import { env } from "@cobalt-web/env/server";
import type { ToolBinding } from "@tanstack/ai-code-mode";
import { createCloudflareIsolateDriver } from "@tanstack/ai-isolate-cloudflare";

import { buildBindings } from "./bindings.js";
import type { Binding } from "./bindings.js";

const TIMEOUT_MS = 180_000;
const MAX_OUTPUT_CHARS = 25_000;

const truncate = (s: string) =>
  s.length > MAX_OUTPUT_CHARS
    ? `${s.slice(0, MAX_OUTPUT_CHARS)}\n[truncated ${s.length - MAX_OUTPUT_CHARS} chars]`
    : s;

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === "bigint") {
          return v.toString();
        }
        if (v instanceof Date) {
          return v.toISOString();
        }
        return v;
      },
      2
    );
  } catch {
    return String(value);
  }
};

function bindingsToMap(bindings: Binding[]): Record<string, ToolBinding> {
  const map: Record<string, ToolBinding> = {};
  for (const b of bindings) {
    map[b.name] = {
      description: b.description,
      execute: async (args) => safeStringify(await b.handler(args)),
      inputSchema: b.inputSchema,
      name: b.name,
    };
  }
  return map;
}

/**
 * Build a `cobalt.<group>.<method>` shim from binding names of shape
 * `<group>_<method>`. The TanStack worker exposes bindings as flat globals;
 * we inject this shim ahead of user code so the LLM can call the namespaced
 * surface it's already trained on.
 */
function buildShim(bindingNames: string[]): string {
  const groups: Record<string, string[]> = {};
  for (const name of bindingNames) {
    const idx = name.indexOf("_");
    if (idx <= 0) {
      continue;
    }
    const group = name.slice(0, idx);
    const method = name.slice(idx + 1);
    (groups[group] ??= []).push(method);
  }
  const groupExprs = Object.entries(groups).map(([group, methods]) => {
    const props = methods
      .map(
        (m) =>
          `${m}: async (input) => { const r = await ${group}_${m}(input ?? {}); return typeof r === "string" ? JSON.parse(r) : r; }`
      )
      .join(", ");
    return `${group}: { ${props} }`;
  });
  return `const cobalt = { ${groupExprs.join(", ")} };`;
}

export interface RunResult {
  stdout: string;
  ok: boolean;
  error?: { name: string; message: string };
}

let cachedDriver: ReturnType<typeof createCloudflareIsolateDriver> | null =
  null;
function getDriver() {
  if (!env.SANDBOX_WORKER_URL) {
    return null;
  }
  if (!cachedDriver) {
    cachedDriver = createCloudflareIsolateDriver({
      authorization: env.SANDBOX_WORKER_AUTH_TOKEN
        ? `Bearer ${env.SANDBOX_WORKER_AUTH_TOKEN}`
        : undefined,
      timeout: TIMEOUT_MS,
      workerUrl: env.SANDBOX_WORKER_URL,
    });
  }
  return cachedDriver;
}

export async function runUserCode(
  bindings: Binding[],
  userCode: string
): Promise<RunResult> {
  const driver = getDriver();
  if (!driver) {
    return {
      error: {
        message: "SANDBOX_WORKER_URL must be set to run sandbox code",
        name: "ConfigError",
      },
      ok: false,
      stdout: "",
    };
  }

  const bindingMap = bindingsToMap(bindings);
  const composedCode = `${buildShim(Object.keys(bindingMap))}\n${userCode}`;

  const ctx = await driver.createContext({
    bindings: bindingMap,
    timeout: TIMEOUT_MS,
  });
  try {
    const result = await ctx.execute(composedCode);
    const logs = (result.logs ?? []).join("\n");
    if (!result.success) {
      return {
        error: result.error
          ? { message: result.error.message, name: result.error.name }
          : { message: "unknown execution error", name: "Error" },
        ok: false,
        stdout: truncate(logs),
      };
    }
    const valuePart =
      result.value !== undefined && result.value !== null
        ? safeStringify(result.value)
        : "";
    const combined = [logs, valuePart].filter(Boolean).join("\n");
    return { ok: true, stdout: truncate(combined) };
  } finally {
    await ctx.dispose();
  }
}

/**
 * Run user-supplied JS scoped to a single user. `userId` is captured in the
 * binding handlers' closure on the Vercel side; the sandbox Worker only sees
 * tool *schemas* and never the userId, so sandboxed code cannot supply or
 * override it.
 */
export async function runCobaltCode(
  userId: string,
  code: string
): Promise<RunResult> {
  return await runUserCode(buildBindings(userId), code);
}
