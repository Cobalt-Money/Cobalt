import { describe, expect, test } from "bun:test";

import { deriveSandboxId, signRequest } from "./security";
import type { SandboxClient, SandboxProcess } from "./types";
import { createWorkspaceWorker } from "./worker";

/* oxlint-disable vitest/prefer-importing-vitest-globals, require-await, class-methods-use-this, max-classes-per-file -- SDK fakes implement asynchronous class contracts. */

const SECRET = "test-bridge-secret";
const USER_ID = "user@example.com";
const WORKSPACE_ID = "123e4567-e89b-42d3-a456-426614174000";
const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174001";
const EXECUTION_ID = "123e4567-e89b-42d3-a456-426614174002";

const envelope = {
  requestId: REQUEST_ID,
  scope: { userId: USER_ID, workspaceId: WORKSPACE_ID },
  version: 1,
} as const;

class FakeProcess implements SandboxProcess {
  readonly id = `exec-${EXECUTION_ID}`;
  killed = false;
  logs = { stderr: "warning\n", stdout: "done\n" };
  result = { exitCode: 0 };
  waitError: Error | undefined;

  async getLogs(): Promise<{ stderr: string; stdout: string }> {
    return this.logs;
  }

  async kill(): Promise<void> {
    this.killed = true;
  }

  async waitForExit(): Promise<{ exitCode: number }> {
    if (this.waitError) {
      throw this.waitError;
    }
    return this.result;
  }
}

class FakeSandbox implements SandboxClient {
  destroyed = false;
  destroyCalls = 0;
  destroyMissingAfterFirst = false;
  readonly execCalls: string[] = [];
  readonly mountCalls: {
    binding: string;
    mountPath: string;
    options: { localBucket?: boolean; prefix: string; readOnly: boolean };
  }[] = [];
  readonly process = new FakeProcess();
  readonly reads: string[] = [];
  readonly started: { command: string; options: Record<string, unknown> }[] = [];
  readonly writes: { content: string; path: string }[] = [];
  realPathOverride: string | undefined;
  returnProcess = false;

  async destroy(): Promise<void> {
    this.destroyCalls += 1;
    if (this.destroyMissingAfterFirst && this.destroyCalls > 1) {
      throw new Error("sandbox not found");
    }
    this.destroyed = true;
  }

  async exec(
    command: string,
  ): Promise<{ exitCode: number; stderr: string; stdout: string; success: boolean }> {
    this.execCalls.push(command);
    if (command.startsWith("realpath ")) {
      const requestedPath = command.slice(command.indexOf("-- '") + 4, -1);
      return {
        exitCode: 0,
        stderr: "",
        stdout: `${this.realPathOverride ?? requestedPath}\n`,
        success: true,
      };
    }
    return { exitCode: 1, stderr: "", stdout: "", success: false };
  }

  async getProcess(id: string): Promise<SandboxProcess | null> {
    return this.returnProcess && id === this.process.id ? this.process : null;
  }

  async listFiles(): Promise<{
    files: { absolutePath: string; name: string; size: number; type: "file" }[];
  }> {
    return {
      files: [
        {
          absolutePath: "/mnt/outputs/report.pdf",
          name: "report.pdf",
          size: 12,
          type: "file",
        },
      ],
    };
  }

  async mountBucket(
    binding: string,
    mountPath: string,
    options: { localBucket?: boolean; prefix: string; readOnly: boolean },
  ): Promise<void> {
    this.mountCalls.push({ binding, mountPath, options });
  }

  async readFile(path: string): Promise<{ content: string; size: number }> {
    this.reads.push(path);
    return { content: "aGVsbG8=", size: 5 };
  }

  async startProcess(command: string, options: Record<string, unknown>): Promise<SandboxProcess> {
    this.started.push({ command, options });
    return this.process;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.writes.push({ content: atob(content), path });
  }
}

const signedRequest = async (payload: unknown): Promise<Request> => {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = await signRequest(SECRET, "POST", "/v1/bridge", timestamp, body);
  return new Request("https://worker.example/v1/bridge", {
    body,
    headers: {
      "content-type": "application/json",
      "x-cobalt-signature": signature,
      "x-cobalt-timestamp": timestamp,
    },
    method: "POST",
  });
};

const setup = () => {
  const sandbox = new FakeSandbox();
  const sandboxIds: string[] = [];
  const worker = createWorkspaceWorker({
    getSandbox: (id) => {
      sandboxIds.push(id);
      return sandbox;
    },
  });
  const env = {
    BRIDGE_AUTH_SECRET: SECRET,
    LOCAL_R2_MOUNTS: "false",
  };
  return { env, sandbox, sandboxIds, worker };
};

describe("workspace Worker authentication and scope", () => {
  test("rejects unsigned requests before resolving a sandbox", async () => {
    const { env, sandboxIds, worker } = setup();
    const response = await worker.fetch(
      new Request("https://worker.example/v1/bridge", { body: "{}", method: "POST" }),
      env,
    );

    expect(response.status).toBe(401);
    expect(sandboxIds).toHaveLength(0);
  });

  test("rejects arbitrary sandbox IDs and mismatched command scope", async () => {
    const { env, sandboxIds, worker } = setup();
    const arbitrary = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "CreateWorkspace",
        sandboxId: "victim-sandbox",
      }),
      env,
    );
    const mismatch = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "ExecuteCommand",
        command: {
          argv: ["bash", "-lc", "true"],
          cwd: "/workspace",
          env: {},
          executionId: EXECUTION_ID,
          idempotencyKey: "execute-1",
          timeoutMs: 1000,
          userId: "other@example.com",
          workspaceId: WORKSPACE_ID,
        },
      }),
      env,
    );

    expect(arbitrary.status).toBe(400);
    expect(mismatch.status).toBe(403);
    expect(sandboxIds).toHaveLength(0);
  });
});

describe("workspace lifecycle and mounts", () => {
  test("derives the sandbox ID and mounts only scoped upload/output prefixes", async () => {
    const { env, sandbox, sandboxIds, worker } = setup();
    const response = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "CreateWorkspace" }),
      env,
    );

    expect(response.status).toBe(200);
    expect(sandboxIds).toEqual([
      await deriveSandboxId({ userId: USER_ID, workspaceId: WORKSPACE_ID }),
    ]);
    expect(sandbox.mountCalls).toEqual([
      {
        binding: "WORKSPACE_UPLOADS",
        mountPath: "/mnt/uploads",
        options: {
          prefix:
            "/users/dXNlckBleGFtcGxlLmNvbQ/workspaces/123e4567-e89b-42d3-a456-426614174000/uploads/",
          readOnly: true,
        },
      },
      {
        binding: "WORKSPACE_OUTPUTS",
        mountPath: "/mnt/outputs",
        options: {
          prefix:
            "/users/dXNlckBleGFtcGxlLmNvbQ/workspaces/123e4567-e89b-42d3-a456-426614174000/outputs/",
          readOnly: false,
        },
      },
    ]);
  });

  test("makes stop idempotent", async () => {
    const { env, sandbox, worker } = setup();
    sandbox.destroyMissingAfterFirst = true;
    const first = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "StopWorkspace" }),
      env,
    );
    const second = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "StopWorkspace" }),
      env,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(sandbox.destroyed).toBe(true);
  });
});

describe("workspace execution", () => {
  test("executes a validated process and returns the completed result", async () => {
    const { env, sandbox, worker } = setup();
    const response = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "ExecuteCommand",
        command: {
          argv: ["python3", "-c", "print('done')"],
          cwd: "/workspace",
          env: { PYTHONUNBUFFERED: "1" },
          executionId: EXECUTION_ID,
          idempotencyKey: "execute-1",
          timeoutMs: 1000,
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as Record<string, unknown>).toEqual({
      exitCode: 0,
      stderr: "warning\n",
      stdout: "done\n",
      success: true,
    });
    expect(sandbox.started[0]).toMatchObject({
      command: "'python3' '-c' 'print('\\''done'\\'')'",
      options: {
        autoCleanup: false,
        cwd: "/workspace",
        env: { PYTHONUNBUFFERED: "1" },
        processId: `exec-${EXECUTION_ID}`,
      },
    });
  });

  test("cancels only an execution inside the supplied workspace scope", async () => {
    const { env, sandbox, worker } = setup();
    sandbox.returnProcess = true;
    const response = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "CancelExecution", executionId: EXECUTION_ID }),
      env,
    );

    expect(response.status).toBe(200);
    expect(sandbox.process.killed).toBe(true);
  });

  test("kills a process whose bounded wait times out", async () => {
    const { env, sandbox, worker } = setup();
    sandbox.process.waitError = new Error("Process did not become ready within 1ms");
    const response = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "ExecuteCommand",
        command: {
          argv: ["bash", "-lc", "sleep 60"],
          cwd: "/workspace",
          env: {},
          executionId: EXECUTION_ID,
          idempotencyKey: "execute-timeout",
          timeoutMs: 1,
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
        },
      }),
      env,
    );

    expect(response.status).toBe(504);
    expect(sandbox.process.killed).toBe(true);
  });
});

describe("workspace file operations", () => {
  test("reads, writes, and lists only validated mounted paths", async () => {
    const { env, sandbox, worker } = setup();
    const readResponse = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "ReadFile", path: "/mnt/uploads/input.txt" }),
      env,
    );
    const writeResponse = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "WriteFile",
        contentBase64: "aGVsbG8=",
        path: "/mnt/outputs/report.txt",
      }),
      env,
    );
    const listResponse = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "ListFiles", path: "/mnt/outputs" }),
      env,
    );

    expect((await readResponse.json()) as Record<string, unknown>).toEqual({
      contentBase64: "aGVsbG8=",
      size: 5,
    });
    expect(writeResponse.status).toBe(200);
    expect(sandbox.writes).toEqual([{ content: "hello", path: "/mnt/outputs/report.txt" }]);
    expect((await listResponse.json()) as Record<string, unknown>).toEqual({
      files: [{ path: "/mnt/outputs/report.pdf", size: 12, type: "file" }],
    });
  });

  test("rejects traversal and writes to the upload mount", async () => {
    const { env, sandboxIds, worker } = setup();
    const traversal = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "ReadFile",
        path: "/mnt/uploads/../outputs/private.txt",
      }),
      env,
    );
    const uploadWrite = await worker.fetch(
      await signedRequest({
        ...envelope,
        _tag: "WriteFile",
        contentBase64: "aGVsbG8=",
        path: "/mnt/uploads/input.txt",
      }),
      env,
    );

    expect(traversal.status).toBe(400);
    expect(uploadWrite.status).toBe(400);
    expect(sandboxIds).toHaveLength(0);
  });

  test("rejects a canonical-looking path that resolves through a symlink outside its mount", async () => {
    const { env, sandbox, worker } = setup();
    sandbox.realPathOverride = "/etc/passwd";
    const response = await worker.fetch(
      await signedRequest({ ...envelope, _tag: "ReadFile", path: "/workspace/link" }),
      env,
    );

    expect(response.status).toBe(400);
    expect(sandbox.reads).toHaveLength(0);
  });
});
