import { wrapCode } from "@tanstack/ai-code-mode";
import type { ToolBinding } from "@tanstack/ai-code-mode";
import { createNodeIsolateDriver } from "@tanstack/ai-isolate-node";
import tsBlankSpace from "ts-blank-space";

import { buildBindings } from "./bindings.js";
import type { Binding } from "./bindings.js";

const TIMEOUT_MS = 180_000;
const MEMORY_LIMIT_MB = 128;
const MAX_OUTPUT_CHARS = 25_000;

// Probe subprocess fails under Nitro dev/bun runtime (spawnSync result lacks
// stderr in this path). Compat verified by unit tests + first dlopen will
// throw a real error if the binary is incompatible — probe was only a
// safety net for segfault, which our prebuilt ABI matches don't trigger.
const driver = createNodeIsolateDriver({
  memoryLimit: MEMORY_LIMIT_MB,
  skipProbe: true,
  timeout: TIMEOUT_MS,
});

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
 * Build `cobalt.*` namespace shim from binding names of shape `<group>_<method>`.
 * Each binding becomes `cobalt[group][method] = async (input) => JSON.parse(await <name>(input))`
 * since bindings stringify their result before crossing the isolate boundary.
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

export async function runUserCode(
  bindings: Binding[],
  userCode: string
): Promise<RunResult> {
  const bindingMap = bindingsToMap(bindings);
  const shim = buildShim(Object.keys(bindingMap));
  // ts-blank-space erases TS-only tokens (annotations, interfaces, generics,
  // `as` casts) by replacing them with whitespace. Pure JS, in-process — no
  // subprocess + no native binary, so it survives noExternals: true bundling
  // and Vercel's fd-restricted runtime where esbuild's transform() can't.
  // Caveat: doesn't lower TS runtime constructs (enum/decorator/namespace).
  // LLM rarely emits those in sandbox snippets; if it does, V8 parse error
  // → tool retry → LLM rewrites in idiomatic JS.
  let stripped: string;
  try {
    stripped = tsBlankSpace(userCode);
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: "TranspileError",
      },
      ok: false,
      stdout: "",
    };
  }
  const composedCode = `${shim}\n${stripped}`;

  const ctx = await driver.createContext({
    bindings: bindingMap,
    memoryLimit: MEMORY_LIMIT_MB,
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

// Re-export wrapCode for completeness; isolate context applies it internally.
export { wrapCode };

/**
 * Run user-supplied TS/JS scoped to a single user. Builds the cobalt bindings
 * with `userId` captured in closure (sandbox cannot supply or override it).
 */
export async function runCobaltCode(
  userId: string,
  code: string
): Promise<RunResult> {
  return await runUserCode(buildBindings(userId), code);
}
