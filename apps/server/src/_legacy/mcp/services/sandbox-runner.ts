import { randomUUID } from "node:crypto";

import { env } from "@cobalt-web/env/server";

import { signBridgeToken } from "../../api/internal/agent-bridge/jwt.js";
import { COBALT_SDK_SHIM } from "./cobalt-sdk-shim.js";
import { daytonaSandboxBackend } from "./sandbox-runner-daytona.js";
import type { SandboxBackend, SandboxRunResult } from "./sandbox-runner-types.js";
import { TOKEN_TTL_SECONDS } from "./sandbox-runner-types.js";
import { vercelSandboxBackend } from "./sandbox-runner-vercel.js";

export type { SandboxRunResult } from "./sandbox-runner-types.js";

function bridgeUrl(): string {
  return env.AGENT_BRIDGE_URL ?? env.BETTER_AUTH_URL;
}

function backend(): SandboxBackend {
  switch (env.SANDBOX_RUNTIME) {
    case "daytona": {
      return daytonaSandboxBackend;
    }
    case "vercel": {
      return vercelSandboxBackend;
    }
    default: {
      return vercelSandboxBackend;
    }
  }
}

/**
 * Runs LLM-authored JS in a fresh sandbox with the Cobalt SDK shim prepended.
 * Mints a per-sandbox bridge JWT (5min TTL) so calls inside `cobalt.*` reach
 * back into the Hono server scoped to `userId`.
 *
 * The active backend is selected by `SANDBOX_RUNTIME` env (`vercel` | `daytona`).
 */
export async function runUserCode(userId: string, userCode: string): Promise<SandboxRunResult> {
  const sandboxId = randomUUID();
  const token = await signBridgeToken({ sandboxId, userId }, TOKEN_TTL_SECONDS);

  const program = `${COBALT_SDK_SHIM}\n;(async () => {\n${userCode}\n})().catch((e) => { console.error(e?.stack ?? String(e)); process.exit(1); });`;

  return backend().run({
    bridgeToken: token,
    bridgeUrl: bridgeUrl(),
    program,
  });
}
