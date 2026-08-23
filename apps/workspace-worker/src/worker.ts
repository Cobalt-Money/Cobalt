import { deriveSandboxId, deriveStoragePrefixes, verifySignedRequest } from "./security";
import type { WorkspaceScope } from "./security";
import { retryOperation } from "./retry";
import type { SandboxClient, WorkspaceWorkerEnv } from "./types";
import {
  buildCommand,
  isPlainRecord,
  RequestValidationError,
  requireExactKeys,
  validateEnvironment,
  validateWorkspacePath,
  validateWorkspaceScope,
} from "./validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_REQUEST_BYTES = 14 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TIMEOUT_MS = 3_600_000;
const MOUNT_CHECK_TIMEOUT_MS = 10_000;

interface WorkspaceWorkerDependencies {
  readonly getSandbox: (sandboxId: string) => SandboxClient;
}

interface RequestEnvelope {
  readonly requestId: string;
  readonly scope: WorkspaceScope;
}

type WorkerErrorCode = "FORBIDDEN" | "NOT_FOUND" | "TIMEOUT";

class WorkerRequestError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string) {
    super(message);
    this.name = "WorkerRequestError";
    this.code = code;
  }
}

const json = (value: unknown, status = 200): Response =>
  Response.json(value, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
    status,
  });

const errorResponse = (code: string, status: number): Response =>
  json({ error: { code, retryable: status === 503 } }, status);

const requireUuid = (value: unknown, name: string): string => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new RequestValidationError(`${name} must be a UUID`);
  }
  return value;
};

const parseEnvelope = (value: Record<string, unknown>): RequestEnvelope => {
  if (value.version !== 1) {
    throw new RequestValidationError("Unsupported bridge version");
  }
  return {
    requestId: requireUuid(value.requestId, "requestId"),
    scope: validateWorkspaceScope(value.scope),
  };
};

const scopesMatch = (left: WorkspaceScope, right: WorkspaceScope): boolean =>
  left.userId === right.userId && left.workspaceId === right.workspaceId;

const isMounted = async (sandbox: SandboxClient, path: string): Promise<boolean> => {
  const result = await sandbox.exec(`mountpoint -q '${path}'`, {
    timeout: MOUNT_CHECK_TIMEOUT_MS,
  });
  return result.success;
};

const mountRoot = (path: string): string => {
  if (path === "/mnt/uploads" || path.startsWith("/mnt/uploads/")) {
    return "/mnt/uploads";
  }
  if (path === "/mnt/outputs" || path.startsWith("/mnt/outputs/")) {
    return "/mnt/outputs";
  }
  return "/workspace";
};

const quoteShellValue = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;

const assertResolvedPath = async (
  sandbox: SandboxClient,
  path: string,
  operation: "list" | "read" | "write",
): Promise<void> => {
  const flag = operation === "write" ? "-m" : "-e";
  const result = await sandbox.exec(`realpath ${flag} -- ${quoteShellValue(path)}`, {
    timeout: MOUNT_CHECK_TIMEOUT_MS,
  });
  if (!result.success) {
    throw new RequestValidationError("Path does not exist or cannot be resolved");
  }
  const resolvedPath = validateWorkspacePath(result.stdout.trim(), operation);
  if (mountRoot(resolvedPath) !== mountRoot(path)) {
    throw new RequestValidationError("Path resolves outside its requested mount");
  }
};

const ensureMounts = async (
  sandbox: SandboxClient,
  scope: WorkspaceScope,
  localBucket: boolean,
): Promise<void> => {
  const prefixes = deriveStoragePrefixes(scope);
  const mounts = [
    {
      binding: "WORKSPACE_UPLOADS",
      mountPath: "/mnt/uploads",
      prefix: prefixes.uploads,
      readOnly: true,
    },
    {
      binding: "WORKSPACE_OUTPUTS",
      mountPath: "/mnt/outputs",
      prefix: prefixes.outputs,
      readOnly: false,
    },
  ] as const;
  for (const mount of mounts) {
    if (await isMounted(sandbox, mount.mountPath)) {
      continue;
    }
    await sandbox.mountBucket(mount.binding, mount.mountPath, {
      ...(localBucket ? { localBucket: true } : {}),
      prefix: mount.prefix,
      readOnly: mount.readOnly,
    });
  }
};

const resolveReadySandbox = async (
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
  scope: WorkspaceScope,
): Promise<SandboxClient> => {
  const sandboxId = await deriveSandboxId(scope);
  const sandbox = dependencies.getSandbox(sandboxId);
  await retryOperation(async () => {
    await ensureMounts(sandbox, scope, env.LOCAL_R2_MOUNTS === "true");
  });
  return sandbox;
};

const parseBase64Size = (value: unknown): { readonly content: string; readonly size: number } => {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ) {
    throw new RequestValidationError("contentBase64 is invalid or too large");
  }
  let padding = 0;
  if (value.endsWith("==")) {
    padding = 2;
  } else if (value.endsWith("=")) {
    padding = 1;
  }
  const size = (value.length / 4) * 3 - padding;
  if (size > MAX_FILE_BYTES) {
    throw new RequestValidationError("File exceeds the 10 MiB limit");
  }
  return { content: value, size };
};

const workspaceResult = (requestId: string, state: "running" | "stopped"): Response =>
  json({ requestId, state, version: 1 });

const handleLifecycle = async (
  tag: string,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  if (tag === "StopWorkspace") {
    const sandbox = dependencies.getSandbox(await deriveSandboxId(envelope.scope));
    try {
      await retryOperation(async () => {
        await sandbox.destroy();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("not found") && !message.includes("already stopped")) {
        throw error;
      }
    }
    return workspaceResult(envelope.requestId, "stopped");
  }
  await resolveReadySandbox(dependencies, env, envelope.scope);
  return workspaceResult(envelope.requestId, "running");
};

const handleExecute = async (
  value: Record<string, unknown>,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  if (!isPlainRecord(value.command)) {
    throw new RequestValidationError("command must be an object");
  }
  const { command } = value;
  requireExactKeys(command, [
    "argv",
    "cwd",
    "env",
    "executionId",
    "idempotencyKey",
    "timeoutMs",
    "userId",
    "workspaceId",
  ]);
  const commandScope = validateWorkspaceScope({
    userId: command.userId,
    workspaceId: command.workspaceId,
  });
  if (!scopesMatch(envelope.scope, commandScope)) {
    throw new WorkerRequestError("FORBIDDEN", "Command scope does not match request scope");
  }
  const executionId = requireUuid(command.executionId, "executionId");
  if (
    typeof command.idempotencyKey !== "string" ||
    command.idempotencyKey.length === 0 ||
    command.idempotencyKey.length > 200
  ) {
    throw new RequestValidationError("idempotencyKey is invalid");
  }
  if (
    typeof command.timeoutMs !== "number" ||
    !Number.isInteger(command.timeoutMs) ||
    command.timeoutMs < 1 ||
    command.timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new RequestValidationError("timeoutMs is invalid");
  }
  const cwd = validateWorkspacePath(command.cwd, "read");
  const environment = validateEnvironment(command.env);
  const shellCommand = buildCommand(command.argv);
  const sandbox = await resolveReadySandbox(dependencies, env, envelope.scope);
  const process = await sandbox.startProcess(shellCommand, {
    autoCleanup: false,
    cwd,
    env: environment,
    processId: `exec-${executionId}`,
    timeout: command.timeoutMs,
  });
  let exitCode: number;
  try {
    ({ exitCode } = await process.waitForExit(command.timeoutMs));
  } catch (error) {
    await retryOperation(async () => {
      await process.kill("SIGKILL");
    });
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("timeout") || message.includes("within")) {
      throw new WorkerRequestError("TIMEOUT", "Execution timed out");
    }
    throw error;
  }
  const logs = await process.getLogs();
  return json({
    exitCode,
    stderr: logs.stderr,
    stdout: logs.stdout,
    success: exitCode === 0,
  });
};

const handleCancel = async (
  value: Record<string, unknown>,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
): Promise<Response> => {
  const executionId = requireUuid(value.executionId, "executionId");
  const sandbox = dependencies.getSandbox(await deriveSandboxId(envelope.scope));
  const process = await sandbox.getProcess(`exec-${executionId}`);
  if (!process) {
    throw new WorkerRequestError("NOT_FOUND", "Execution was not found in this workspace");
  }
  await retryOperation(async () => {
    await process.kill("SIGKILL");
  });
  return json({ executionId, requestId: envelope.requestId, version: 1 });
};

const handleReadFile = async (
  value: Record<string, unknown>,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  const path = validateWorkspacePath(value.path, "read");
  const sandbox = await resolveReadySandbox(dependencies, env, envelope.scope);
  await assertResolvedPath(sandbox, path, "read");
  const result = await sandbox.readFile(path, { encoding: "base64" });
  return json({ contentBase64: result.content, size: result.size ?? 0 });
};

const handleWriteFile = async (
  value: Record<string, unknown>,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  const path = validateWorkspacePath(value.path, "write");
  const file = parseBase64Size(value.contentBase64);
  const sandbox = await resolveReadySandbox(dependencies, env, envelope.scope);
  await assertResolvedPath(sandbox, path, "write");
  await sandbox.writeFile(path, file.content, { encoding: "base64" });
  return json({ file: { path, size: file.size, type: "file" } });
};

const handleListFiles = async (
  value: Record<string, unknown>,
  envelope: RequestEnvelope,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  const path = validateWorkspacePath(value.path, "list");
  const sandbox = await resolveReadySandbox(dependencies, env, envelope.scope);
  await assertResolvedPath(sandbox, path, "list");
  const result = await sandbox.listFiles(path, { includeHidden: false, recursive: false });
  if (result.files.length > 1000) {
    throw new RequestValidationError("Directory contains too many entries");
  }
  const files = result.files.map((file) => ({
    path: validateWorkspacePath(file.absolutePath, "read"),
    size: file.size,
    type: file.type === "directory" ? "directory" : "file",
  }));
  return json({ files });
};

const handleBridgeRequest = (
  parsed: unknown,
  dependencies: WorkspaceWorkerDependencies,
  env: WorkspaceWorkerEnv,
): Promise<Response> => {
  if (!isPlainRecord(parsed) || typeof parsed._tag !== "string") {
    throw new RequestValidationError("Bridge request is invalid");
  }
  const envelope = parseEnvelope(parsed);
  switch (parsed._tag) {
    case "CreateWorkspace":
    case "WakeWorkspace":
    case "StopWorkspace": {
      requireExactKeys(parsed, ["_tag", "requestId", "scope", "version"]);
      return handleLifecycle(parsed._tag, envelope, dependencies, env);
    }
    case "ExecuteCommand": {
      requireExactKeys(parsed, ["_tag", "command", "requestId", "scope", "version"]);
      return handleExecute(parsed, envelope, dependencies, env);
    }
    case "CancelExecution": {
      requireExactKeys(parsed, ["_tag", "executionId", "requestId", "scope", "version"]);
      return handleCancel(parsed, envelope, dependencies);
    }
    case "ReadFile":
    case "ListFiles": {
      requireExactKeys(parsed, ["_tag", "path", "requestId", "scope", "version"]);
      return parsed._tag === "ReadFile"
        ? handleReadFile(parsed, envelope, dependencies, env)
        : handleListFiles(parsed, envelope, dependencies, env);
    }
    case "WriteFile": {
      requireExactKeys(parsed, ["_tag", "contentBase64", "path", "requestId", "scope", "version"]);
      return handleWriteFile(parsed, envelope, dependencies, env);
    }
    default: {
      throw new RequestValidationError("Unknown bridge operation");
    }
  }
};

export const createWorkspaceWorker = (dependencies: WorkspaceWorkerDependencies) => ({
  async fetch(request: Request, env: WorkspaceWorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/v1/bridge") {
      return errorResponse("NOT_FOUND", 404);
    }
    if (request.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", 405);
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return errorResponse("INVALID_REQUEST", 413);
    }
    if (
      !(await verifySignedRequest({
        body,
        headers: request.headers,
        method: request.method,
        pathname: url.pathname,
        secret: env.BRIDGE_AUTH_SECRET,
      }))
    ) {
      return errorResponse("UNAUTHENTICATED", 401);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse("INVALID_REQUEST", 415);
    }
    try {
      return await handleBridgeRequest(JSON.parse(body) as unknown, dependencies, env);
    } catch (error) {
      if (error instanceof RequestValidationError || error instanceof SyntaxError) {
        return errorResponse("INVALID_REQUEST", 400);
      }
      if (error instanceof WorkerRequestError) {
        const statuses = { FORBIDDEN: 403, NOT_FOUND: 404, TIMEOUT: 504 } as const;
        return errorResponse(error.code, statuses[error.code]);
      }
      return errorResponse("UNAVAILABLE", 503);
    }
  },
});
