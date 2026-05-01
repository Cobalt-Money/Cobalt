import { env } from "@cobalt-web/env/server";
import { Sandbox } from "@vercel/sandbox";

import type { SandboxBackend } from "./sandbox-runner-types.js";
import {
  SANDBOX_NODE_RUNTIME,
  SCRIPT_TIMEOUT_MS,
} from "./sandbox-runner-types.js";

const SCRIPT_PATH = "run.mjs";

function requireVercelEnv(): {
  projectId: string;
  teamId: string;
  token: string;
} {
  if (!env.VERCEL_TOKEN || !env.VERCEL_TEAM_ID || !env.VERCEL_PROJECT_ID) {
    throw new Error(
      "SANDBOX_RUNTIME=vercel requires VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID"
    );
  }
  return {
    projectId: env.VERCEL_PROJECT_ID,
    teamId: env.VERCEL_TEAM_ID,
    token: env.VERCEL_TOKEN,
  };
}

export const vercelSandboxBackend: SandboxBackend = {
  async run({ bridgeToken, bridgeUrl, program }) {
    const creds = requireVercelEnv();
    const sandbox = await Sandbox.create({
      env: {
        BRIDGE_TOKEN: bridgeToken,
        BRIDGE_URL: bridgeUrl,
      },
      projectId: creds.projectId,
      runtime: SANDBOX_NODE_RUNTIME,
      teamId: creds.teamId,
      timeout: SCRIPT_TIMEOUT_MS,
      token: creds.token,
    });
    try {
      await sandbox.writeFiles([{ content: program, path: SCRIPT_PATH }]);
      const cmd = await sandbox.runCommand("node", [SCRIPT_PATH]);
      const [stdout, stderr] = await Promise.all([cmd.stdout(), cmd.stderr()]);
      return {
        exitCode: cmd.exitCode,
        ok: cmd.exitCode === 0,
        stderr,
        stdout,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
        stdout: "",
      };
    } finally {
      try {
        await sandbox.stop();
      } catch {
        // Sandbox auto-terminates on timeout; swallow cleanup errors.
      }
    }
  },
};
