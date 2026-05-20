/* eslint-disable promise/avoid-new,promise/no-multiple-resolved,unicorn/consistent-function-scoping */
/**
 * Vitest globalSetup: spawn the Nitro dev server before any integration test
 * runs, wait for it to report ready, and tear it down cleanly afterward.
 *
 * Shape lifted from https://workflow-sdk.dev/docs/testing/server-based.
 * Tests communicate with this server via HTTP (`WORKFLOW_LOCAL_BASE_URL` is
 * set in vitest.integration.config.ts).
 */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

// Bun's ChildProcess type doesn't surface EventEmitter methods; intersect to
// recover `.on(...)` typing without pulling all of @types/node into the build.
type Process = ChildProcess & EventEmitter;

const PORT = "4000";
const READY_TIMEOUT_MS = 90_000;

let server: Process | null = null;

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      event,
      port: PORT,
      scope: "workflow-integration-setup",
      ...fields,
    }),
  );
}

export async function setup(): Promise<void> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  log("server_starting", { command: "bun nitro dev" });

  server = spawn("bun", ["nitro", "dev", "--port", PORT], {
    cwd: process.cwd(),
    detached: false,
    env: {
      ...process.env,
      // Treat spawn as CI so Nitro doesn't try to open interactive prompts.
      CI: "1",
      NODE_ENV: "development",
      // The server's workflow runtime uses this to post step messages back
      // to itself. Without it, the local-world queue fails to resolve a base
      // URL and the first step never completes.
      PORT,
      WORKFLOW_LOCAL_BASE_URL: `http://localhost:${PORT}`,
    },
    stdio: "pipe",
  }) as Process;

  server?.stdout?.on("data", (data) => {
    const output = String(data);
    stdout.push(output);
    process.stdout.write(`[nitro] ${output}`);
  });
  server?.stderr?.on("data", (data) => {
    const output = String(data);
    stderr.push(output);
    process.stderr.write(`[nitro-err] ${output}`);
  });
  server?.on("error", (error) => {
    log("server_process_error", { message: error.message, name: error.name });
  });
  server?.on("exit", (code, signal) => {
    log("server_exit", { code, signal });
  });

  // Poll the port directly instead of scraping stdout — Nitro's logger can
  // buffer or skip the "Listening" line under pipe stdio, and port-probing
  // is the actual signal we care about anyway.
  const ready = await (async () => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (server?.exitCode !== null && server?.exitCode !== undefined) {
        return false;
      }
      try {
        const res = await fetch(`http://localhost:${PORT}/`, {
          signal: AbortSignal.timeout(2000),
        });
        // Any response (even 404) proves the server is listening.
        if (res.status > 0) {
          return true;
        }
      } catch {
        // Not listening yet — back off and retry.
      }
      await delay(500);
    }
    return false;
  })();

  if (!ready) {
    const tail = (lines: string[]): string => lines.join("").trim().slice(-1500) || "(empty)";
    throw new Error(
      [
        `Nitro dev server didn't report ready within ${READY_TIMEOUT_MS}ms.`,
        "Is docker running + local Postgres up? (bun run db:local:up)",
        `Recent stdout:\n${tail(stdout)}`,
        `Recent stderr:\n${tail(stderr)}`,
      ].join("\n\n"),
    );
  }

  // Nitro occasionally logs "ready" before every route handler is wired —
  // give it a second to finish warmup so the first test doesn't race.
  await delay(1000);
  log("server_ready");
}

export async function teardown(): Promise<void> {
  if (!server) {
    return;
  }

  log("server_stopping");
  server.kill("SIGTERM");
  await delay(1000);
  if (!server.killed) {
    log("server_force_kill");
    server.kill("SIGKILL");
  }
}
