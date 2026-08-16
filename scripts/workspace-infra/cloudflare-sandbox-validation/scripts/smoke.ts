import { setTimeout as sleep } from "node:timers/promises";

const baseUrl = process.env.SANDBOX_SMOKE_URL;
const token = process.env.SANDBOX_SMOKE_TOKEN;

if (!baseUrl || !token) {
  throw new Error("Set SANDBOX_SMOKE_URL and SANDBOX_SMOKE_TOKEN before running the smoke test.");
}

const sandboxId = `sri-359-${crypto.randomUUID()}`;
const headers = { authorization: `Bearer ${token}` };

const call = async <T>(path: string): Promise<{ body: T; wallMs: number }> => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}?sandboxId=${encodeURIComponent(sandboxId)}`, {
    headers,
    method: "POST",
  });
  const wallMs = Math.round(performance.now() - startedAt);
  const body = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return { body, wallMs };
};

const callThroughLifecycleTransition = async <T>(
  path: string,
): Promise<{ attempts: number; body: T; wallMs: number }> => {
  const startedAt = performance.now();
  let lastError: unknown;

  for (let attempts = 1; attempts <= 12; attempts += 1) {
    try {
      const result = await call<T>(path);
      return {
        attempts,
        body: result.body,
        wallMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      lastError = error;
      await sleep(2000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Lifecycle transition failed");
};

const stream = async (): Promise<{
  events: { clientMs: number; data?: string; type: string }[];
  wallMs: number;
}> => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/stream?sandboxId=${encodeURIComponent(sandboxId)}`, {
    headers,
    method: "POST",
  });
  if (!(response.ok && response.body)) {
    throw new Error(`/stream failed (${response.status})`);
  }

  const events: { clientMs: number; data?: string; type: string }[] = [];
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line) {
        events.push({
          ...(JSON.parse(line) as { data?: string; type: string }),
          clientMs: Math.round(performance.now() - startedAt),
        });
      }
    }
  }

  return { events, wallMs: Math.round(performance.now() - startedAt) };
};

const healthResponse = await fetch(`${baseUrl}/health`);
if (!healthResponse.ok) {
  throw new Error(`/health failed (${healthResponse.status})`);
}

const cold = await call<{
  checks: Record<string, { exitCode: number; stderr: string; stdout: string }>;
}>("/validate");
const warm = await call<typeof cold.body>("/validate");
const streamed = await stream();
const written = await call<{ marker: string }>("/state/write");
const active = await call<{ exists: boolean; marker?: string }>("/state/read");

await sleep(45_000);
const afterSleep = await callThroughLifecycleTransition<{
  exists: boolean;
  marker?: string;
}>("/state/read");
await call<{ destroyed: boolean }>("/destroy");
const afterDestroy = await callThroughLifecycleTransition<{
  exists: boolean;
  marker?: string;
}>("/state/read");
await call<{ destroyed: boolean }>("/destroy");

const stdoutEvents = streamed.events.filter(
  (event) => event.type === "stdout" && event.data?.trim(),
);
const firstStdoutAt = stdoutEvents.at(0)?.clientMs;
const lastStdoutAt = stdoutEvents.at(-1)?.clientMs;
const streamSpanMs =
  firstStdoutAt === undefined || lastStdoutAt === undefined ? 0 : lastStdoutAt - firstStdoutAt;
const checks = {
  activeState: active.body.exists && active.body.marker === written.body.marker,
  bash: cold.body.checks.bash?.exitCode === 0 && cold.body.checks.bash.stdout.includes("bash-ok"),
  commandFailure:
    cold.body.checks.commandFailure?.exitCode === 23 &&
    cold.body.checks.commandFailure.stderr.includes("expected-stderr"),
  destroyClearsState: !afterDestroy.body.exists,
  pypdf:
    cold.body.checks.pypdf?.exitCode === 0 &&
    cold.body.checks.pypdf.stdout.includes("Cobalt Sandbox Smoke"),
  python:
    cold.body.checks.python?.exitCode === 0 && cold.body.checks.python.stdout.includes("python-ok"),
  sleepClearsState: !afterSleep.body.exists,
  streaming: stdoutEvents.length >= 3 && streamSpanMs >= 1500,
};
const report = {
  checks,
  observedAt: new Date().toISOString(),
  sandboxId,
  streamingEvents: streamed.events,
  timingsMs: {
    activeRead: active.wallMs,
    coldValidate: cold.wallMs,
    recreateRead: afterDestroy.wallMs,
    recreateReadAttempts: afterDestroy.attempts,
    stream: streamed.wallMs,
    streamSpan: streamSpanMs,
    wakeRead: afterSleep.wallMs,
    wakeReadAttempts: afterSleep.attempts,
    warmValidate: warm.wallMs,
  },
};

console.log(JSON.stringify(report, null, 2));

if (Object.values(checks).includes(false)) {
  process.exitCode = 1;
}
