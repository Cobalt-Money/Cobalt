import type { ToolBinding } from "@tanstack/ai-code-mode";
import { z } from "zod";

export interface Binding {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

export interface RouteSpec<S extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  handler: (userId: string, args: z.infer<S>) => Promise<unknown>;
}

export function route<S extends z.ZodTypeAny>(
  spec: RouteSpec<S>
): RouteSpec<S> {
  return spec;
}

const toJsonSchema = (s: z.ZodTypeAny): Record<string, unknown> =>
  z.toJSONSchema(s, { target: "draft-7" }) as Record<string, unknown>;

/**
 * Bind a list of `RouteSpec`s to a single `userId`. The `userId` is captured
 * in closure on the host — sandboxed code cannot see, supply, or override it.
 */
export function bindRoutes(
  userId: string,
  routes: RouteSpec<z.ZodTypeAny>[]
): Binding[] {
  return routes.map((r) => ({
    description: r.description,
    handler: async (args: unknown) => {
      const parsed = r.schema.parse(args ?? {});
      return await r.handler(userId, parsed);
    },
    inputSchema: toJsonSchema(r.schema),
    name: r.name,
  }));
}

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

export function bindingsToToolMap(
  bindings: Binding[]
): Record<string, ToolBinding> {
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
 * Build a `<root>.<group>.<method>` shim from binding names of shape
 * `<group>_<method>`. The TanStack worker exposes bindings as flat globals;
 * this shim is injected ahead of user code so the LLM can call the namespaced
 * surface it's already trained on.
 */
export function buildShim(bindingNames: string[], rootName = "cobalt"): string {
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
  return `const ${rootName} = { ${groupExprs.join(", ")} };`;
}

export interface RunResult {
  stdout: string;
  ok: boolean;
  error?: { name: string; message: string };
}

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_OUTPUT_CHARS = 25_000;

const truncate = (s: string, max: number) =>
  s.length > max
    ? `${s.slice(0, max)}\n[truncated ${s.length - max} chars]`
    : s;

/**
 * Driver shape we depend on. Matches `@tanstack/ai-code-mode`'s `IsolateDriver`
 * but typed locally to keep the dep surface minimal.
 */
export interface SandboxDriver {
  createContext(opts: {
    bindings: Record<string, ToolBinding>;
    timeout?: number;
  }): Promise<{
    execute(code: string): Promise<{
      success: boolean;
      value?: unknown;
      logs?: string[];
      error?: { name: string; message: string };
    }>;
    dispose(): Promise<void>;
  }>;
}

export interface RunOptions {
  driver: SandboxDriver | null;
  rootName?: string;
  timeoutMs?: number;
  maxOutputChars?: number;
}

/**
 * Run `userCode` against `bindings` via the supplied driver. Returns a
 * stable `RunResult` shape — never throws.
 */
export async function runWithBindings(
  bindings: Binding[],
  userCode: string,
  options: RunOptions
): Promise<RunResult> {
  const {
    driver,
    rootName = "cobalt",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
  } = options;

  if (!driver) {
    return {
      error: {
        message: "sandbox driver not configured",
        name: "ConfigError",
      },
      ok: false,
      stdout: "",
    };
  }

  const bindingMap = bindingsToToolMap(bindings);
  const composedCode = `${buildShim(Object.keys(bindingMap), rootName)}\n${userCode}`;

  const ctx = await driver.createContext({
    bindings: bindingMap,
    timeout: timeoutMs,
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
        stdout: truncate(logs, maxOutputChars),
      };
    }
    const valuePart =
      result.value !== undefined && result.value !== null
        ? safeStringify(result.value)
        : "";
    const combined = [logs, valuePart].filter(Boolean).join("\n");
    return { ok: true, stdout: truncate(combined, maxOutputChars) };
  } finally {
    await ctx.dispose();
  }
}

export { safeStringify };
