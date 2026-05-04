import { env } from "@cobalt-web/env/server";
import { Daytona } from "@daytona/sdk";

import type { SandboxBackend } from "./sandbox-runner-types.js";
import { SCRIPT_TIMEOUT_MS } from "./sandbox-runner-types.js";

let cachedClient: Daytona | null = null;
function client(): Daytona {
  if (!env.DAYTONA_API_KEY) {
    throw new Error("SANDBOX_RUNTIME=daytona requires DAYTONA_API_KEY");
  }
  cachedClient ??= new Daytona({ apiKey: env.DAYTONA_API_KEY });
  return cachedClient;
}

export const daytonaSandboxBackend: SandboxBackend = {
  async run({ bridgeToken, bridgeUrl, program }) {
    const daytona = client();
    const sandbox = await daytona.create({
      autoStopInterval: 1,
      envVars: {
        BRIDGE_TOKEN: bridgeToken,
        BRIDGE_URL: bridgeUrl,
      },
      language: "typescript",
    });
    try {
      const response = await sandbox.process.codeRun(
        program,
        undefined,
        Math.ceil(SCRIPT_TIMEOUT_MS / 1000),
      );
      return {
        exitCode: response.exitCode,
        ok: (response.exitCode ?? 0) === 0,
        stdout: response.result ?? "",
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
        stdout: "",
      };
    } finally {
      try {
        await daytona.delete(sandbox);
      } catch {
        // Daytona auto-stops; swallow cleanup errors.
      }
    }
  },
};
