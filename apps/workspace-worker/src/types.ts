export interface SandboxProcess {
  readonly id: string;
  getLogs(): Promise<{ readonly stderr: string; readonly stdout: string }>;
  kill(signal?: string): Promise<void>;
  waitForExit(timeout?: number): Promise<{ readonly exitCode: number }>;
}

export interface SandboxFileInfo {
  readonly absolutePath: string;
  readonly name: string;
  readonly size: number;
  readonly type: "directory" | "file" | "other" | "symlink";
}

export interface SandboxClient {
  destroy(): Promise<void>;
  exec(
    command: string,
    options?: { readonly timeout?: number },
  ): Promise<{
    readonly exitCode: number;
    readonly stderr: string;
    readonly stdout: string;
    readonly success: boolean;
  }>;
  getProcess(id: string): Promise<SandboxProcess | null>;
  listFiles(
    path: string,
    options?: { readonly includeHidden?: boolean; readonly recursive?: boolean },
  ): Promise<{ readonly files: readonly SandboxFileInfo[] }>;
  mountBucket(
    binding: string,
    mountPath: string,
    options: {
      readonly localBucket?: boolean;
      readonly prefix: string;
      readonly readOnly: boolean;
    },
  ): Promise<void>;
  readFile(
    path: string,
    options: { readonly encoding: "base64" },
  ): Promise<{ readonly content: string; readonly size?: number }>;
  startProcess(
    command: string,
    options: {
      readonly autoCleanup: boolean;
      readonly cwd: string;
      readonly env: Readonly<Record<string, string>>;
      readonly processId: string;
      readonly timeout: number;
    },
  ): Promise<SandboxProcess>;
  writeFile(
    path: string,
    content: string,
    options: { readonly encoding: "base64" },
  ): Promise<unknown>;
}

export interface WorkspaceWorkerEnv {
  readonly BRIDGE_AUTH_SECRET?: string;
  readonly LOCAL_R2_MOUNTS?: string;
}
