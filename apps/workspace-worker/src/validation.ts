import type { WorkspaceScope } from "./security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ALLOWED_ENVIRONMENT_VARIABLES = new Set([
  "LANG",
  "LC_ALL",
  "PYTHONPATH",
  "PYTHONUNBUFFERED",
  "TZ",
]);
const ALLOWED_EXECUTABLES = new Set([
  "/bin/bash",
  "/usr/bin/bash",
  "/usr/bin/python3",
  "bash",
  "python",
  "python3",
]);
const MAX_ARGUMENTS = 256;
const MAX_ARGUMENT_LENGTH = 32_768;
const MAX_COMMAND_LENGTH = 131_072;

export type PathOperation = "list" | "read" | "write";

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127;
  });

const assertExactKeys = (value: Record<string, unknown>, keys: readonly string[]): void => {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new RequestValidationError("Request contains an unexpected field");
  }
};

export const validateWorkspaceScope = (value: unknown): WorkspaceScope => {
  if (!isRecord(value)) {
    throw new RequestValidationError("Scope must be an object");
  }
  assertExactKeys(value, ["userId", "workspaceId"]);
  const { userId, workspaceId } = value;
  if (
    typeof userId !== "string" ||
    userId.length === 0 ||
    userId.length > 256 ||
    hasControlCharacter(userId)
  ) {
    throw new RequestValidationError("Scope userId is invalid");
  }
  if (typeof workspaceId !== "string" || !UUID_PATTERN.test(workspaceId)) {
    throw new RequestValidationError("Scope workspaceId is invalid");
  }
  return { userId, workspaceId };
};

export const validateWorkspacePath = (value: unknown, operation: PathOperation): string => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("//") ||
    hasControlCharacter(value)
  ) {
    throw new RequestValidationError("Path must be canonical");
  }
  const segments = value.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new RequestValidationError("Path traversal is not allowed");
  }
  const inWorkspace = segments[0] === "workspace";
  const inMount = segments[0] === "mnt" && (segments[1] === "uploads" || segments[1] === "outputs");
  if (!inWorkspace && !inMount) {
    throw new RequestValidationError("Path is outside the workspace mounts");
  }
  if (operation === "write" && segments[0] === "mnt" && segments[1] === "uploads") {
    throw new RequestValidationError("Uploads are read-only");
  }
  return value;
};

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;

export const buildCommand = (value: unknown): string => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ARGUMENTS) {
    throw new RequestValidationError("argv must contain between 1 and 256 arguments");
  }
  if (
    value.some(
      (argument) =>
        typeof argument !== "string" ||
        argument.length > MAX_ARGUMENT_LENGTH ||
        hasControlCharacter(argument),
    )
  ) {
    throw new RequestValidationError("argv contains an invalid argument");
  }
  const argv = value as string[];
  if (!ALLOWED_EXECUTABLES.has(argv[0] ?? "")) {
    throw new RequestValidationError("Only Bash and Python commands are allowed");
  }
  const command = argv.map(shellQuote).join(" ");
  if (command.length > MAX_COMMAND_LENGTH) {
    throw new RequestValidationError("Command is too large");
  }
  return command;
};

export const validateEnvironment = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    throw new RequestValidationError("env must be an object");
  }
  const environment: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!ALLOWED_ENVIRONMENT_VARIABLES.has(key)) {
      throw new RequestValidationError(`Environment variable ${key} is not allowed`);
    }
    if (typeof entry !== "string" || entry.length > 8192 || hasControlCharacter(entry)) {
      throw new RequestValidationError(`Environment variable ${key} has an invalid value`);
    }
    environment[key] = entry;
  }
  return environment;
};

export const isPlainRecord = isRecord;
export const requireExactKeys = assertExactKeys;
