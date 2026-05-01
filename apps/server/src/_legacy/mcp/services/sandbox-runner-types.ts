export const SCRIPT_TIMEOUT_MS = 180_000;
export const TOKEN_TTL_SECONDS = 300;
export const SANDBOX_NODE_RUNTIME = "node22";

export interface SandboxRunResult {
  ok: boolean;
  stdout: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

export interface SandboxBackend {
  /** Run `program` in a fresh single-shot sandbox (MCP `execute_code`). */
  run(args: {
    bridgeToken: string;
    bridgeUrl: string;
    program: string;
  }): Promise<SandboxRunResult>;
}
