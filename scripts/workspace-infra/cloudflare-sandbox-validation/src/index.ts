import { getSandbox } from "@cloudflare/sandbox";
import type { ExecResult, Sandbox } from "@cloudflare/sandbox";

import { hasValidBearerToken } from "./auth";

export { Sandbox } from "@cloudflare/sandbox";

type WorkerEnv = Env & {
  SMOKE_AUTH_TOKEN?: string;
};

const MARKER_PATH = "/workspace/sri-359-marker.txt";
const SANDBOX_ID_PATTERN = /^[a-z0-9-]{1,96}$/;
const SANDBOX_OPTIONS = {
  enableDefaultSession: false,
  normalizeId: true,
  sleepAfter: "30s",
  transport: "rpc",
} as const;

const commandChecks = {
  bash: 'bash -lc \'printf "bash-ok:%s\\n" "$BASH_VERSION"\'',
  commandEnvironment: "bash -lc 'command -v bash python3 pip3; uname -a; id'",
  commandFailure:
    'bash -lc \'printf "expected-stdout\\n"; printf "expected-stderr\\n" >&2; exit 23\'',
  pypdf:
    'python3 -c \'import json; from pypdf import PdfReader; reader = PdfReader("/opt/cobalt/sample.pdf"); print(json.dumps({"pages": len(reader.pages), "title": reader.metadata.title, "version": __import__("pypdf").__version__}))\'',
  python:
    'python3 -c \'import json, platform; print(json.dumps({"status": "python-ok", "version": platform.python_version()}))\'',
} as const;

const jsonError = (error: string, status: number): Response => Response.json({ error }, { status });

const getSandboxId = (url: URL): string | undefined => {
  const sandboxId = url.searchParams.get("sandboxId") ?? undefined;
  return sandboxId && SANDBOX_ID_PATTERN.test(sandboxId) ? sandboxId : undefined;
};

const runChecks = async (
  sandbox: Sandbox,
): Promise<Record<string, ExecResult & { durationMs: number }>> => {
  const results: Record<string, ExecResult & { durationMs: number }> = {};

  for (const [name, command] of Object.entries(commandChecks)) {
    const startedAt = performance.now();
    const result = await sandbox.exec(command, { timeout: 30_000 });
    results[name] = {
      ...result,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  return results;
};

const streamCommand = async (
  sandbox: Sandbox,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> => {
  const encoder = new TextEncoder();
  const startedAt = performance.now();
  const enqueue = (event: Record<string, unknown>): void => {
    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
  };

  try {
    const result = await sandbox.exec(
      'bash -lc \'for value in 1 2 3; do printf "stream-%s\\n" "$value"; sleep 1; done\'',
      {
        onOutput: (stream, data) => {
          enqueue({
            data,
            serverMs: Math.round(performance.now() - startedAt),
            type: stream,
          });
        },
        stream: true,
        timeout: 15_000,
      },
    );
    enqueue({
      exitCode: result.exitCode,
      serverMs: Math.round(performance.now() - startedAt),
      success: result.success,
      type: "complete",
    });
  } catch (error) {
    enqueue({
      message: error instanceof Error ? error.message : "unknown error",
      serverMs: Math.round(performance.now() - startedAt),
      type: "error",
    });
  } finally {
    controller.close();
  }
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    if (request.method !== "POST") {
      return jsonError("method_not_allowed", 405);
    }
    if (!env.SMOKE_AUTH_TOKEN) {
      return jsonError("auth_not_configured", 503);
    }
    if (!(await hasValidBearerToken(request.headers, env.SMOKE_AUTH_TOKEN))) {
      return jsonError("unauthorized", 401);
    }

    const sandboxId = getSandboxId(url);
    if (!sandboxId) {
      return jsonError("invalid_sandbox_id", 400);
    }

    const sandbox = getSandbox(env.Sandbox, sandboxId, SANDBOX_OPTIONS);

    try {
      if (url.pathname === "/validate") {
        return Response.json({ checks: await runChecks(sandbox), sandboxId });
      }
      if (url.pathname === "/stream") {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            ctx.waitUntil(streamCommand(sandbox, controller));
          },
        });
        return new Response(body, {
          headers: {
            "cache-control": "no-store",
            "content-type": "application/x-ndjson",
          },
        });
      }
      if (url.pathname === "/state/write") {
        const marker = crypto.randomUUID();
        await sandbox.writeFile(MARKER_PATH, marker);
        return Response.json({ marker });
      }
      if (url.pathname === "/state/read") {
        const result = await sandbox.exec(`cat ${MARKER_PATH}`, {
          timeout: 10_000,
        });
        return Response.json({
          exists: result.success,
          ...(result.success ? { marker: result.stdout.trim() } : {}),
        });
      }
      if (url.pathname === "/destroy") {
        await sandbox.destroy();
        return Response.json({ destroyed: true });
      }

      return jsonError("not_found", 404);
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : "unknown error",
          sandboxId,
        }),
      );
      return jsonError("sandbox_operation_failed", 500);
    }
  },
};
