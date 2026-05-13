import { runWithBindings } from "@cobalt-web/bindings";
import type { Binding, RunResult, SandboxDriver } from "@cobalt-web/bindings";
import { env } from "@cobalt-web/env/server";
import { createCloudflareIsolateDriver } from "@tanstack/ai-isolate-cloudflare";

import { buildBindings } from "./bindings.js";

const TIMEOUT_MS = 180_000;

export type { RunResult };

let cachedDriver: SandboxDriver | null = null;
function getDriver(): SandboxDriver | null {
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

function runUserCode(bindings: Binding[], userCode: string): Promise<RunResult> {
  return runWithBindings(bindings, userCode, {
    driver: getDriver(),
    timeoutMs: TIMEOUT_MS,
  });
}

/**
 * Run user-supplied JS scoped to a single user. `userId` is captured in the
 * binding handlers' closure on the Vercel side; the sandbox Worker only sees
 * tool *schemas* and never the userId, so sandboxed code cannot supply or
 * override it.
 */
export function runCobaltCode(userId: string, code: string): Promise<RunResult> {
  return runUserCode(buildBindings(userId), code);
}
