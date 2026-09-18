import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MessageChannel, Worker } from "node:worker_threads";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("shadcn loads the real shared theme, including wildcard CSS exports", async () => {
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(
    path.resolve(path.dirname(require.resolve("@shadcn/lint")), "tailwind-worker.js"),
    {
      workerData: { port: port2 },
      transferList: [port2],
    },
  );
  try {
    worker.once("error", (error) => port1.emit("error", error));
    const response = once(port1, "message", { signal: AbortSignal.timeout(15_000) });
    port1.postMessage({
      id: 1,
      cssFile: path.resolve(root, "packages/ui/src/styles/globals.css"),
      candidates: ["bg-primary", "text-success", "rounded-cobalt-does-not-exist"],
      shared: new SharedArrayBuffer(4),
    });
    const [{ answer }] = await response;
    assert.equal(answer.ok, true, answer.reason);
    assert.deepEqual(
      answer.unknown.map(({ token }) => token),
      ["rounded-cobalt-does-not-exist"],
    );
  } finally {
    port1.close();
    await worker.terminate();
  }
});
