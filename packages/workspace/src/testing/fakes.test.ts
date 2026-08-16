import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { authorizeBridgeRequest } from "../bridge/index.js";
import { FileRecordNotFoundError } from "../domain/errors.js";
import {
  command,
  event,
  fileRecord,
  makeInMemoryMetadataStore,
  makeInMemoryWorkspaceRuntime,
  scope,
  UUIDS,
} from "./index.js";

describe("bridge authentication", () => {
  it("fails closed and accepts only the configured bearer token", async () => {
    await expect(
      Effect.runPromise(authorizeBridgeRequest(undefined, "Bearer secret")),
    ).rejects.toMatchObject({
      reason: "secret-not-configured",
    });
    await expect(
      Effect.runPromise(authorizeBridgeRequest("secret", "Bearer secret")),
    ).resolves.toBeUndefined();
    await expect(
      Effect.runPromise(authorizeBridgeRequest("secret", "Bearer wrong")),
    ).rejects.toMatchObject({
      _tag: "BridgeAuthenticationError",
    });
  });
});

describe("in-memory workspace runtime", () => {
  it("streams ordered events and supports explicit cancellation", async () => {
    const runtime = makeInMemoryWorkspaceRuntime({
      execution: () =>
        Stream.fromIterable([event.started(), event.stdout("hello"), event.completed(0)]),
    });
    const expectedScope = scope();
    await Effect.runPromise(runtime.create(expectedScope));
    const events = await Effect.runPromise(Stream.runCollect(runtime.execute(command())));
    expect(events.map(({ _tag, sequence }) => ({ _tag, sequence }))).toStrictEqual([
      { _tag: "ExecutionStarted", sequence: 0 },
      { _tag: "ExecutionStdout", sequence: 1 },
      { _tag: "ExecutionCompleted", sequence: 2 },
    ]);

    await Effect.runPromise(runtime.cancel(expectedScope, UUIDS.execution));
    expect(runtime.inspect().cancelledExecutionIds).toContain(UUIDS.execution);
  });
});

describe("in-memory metadata store", () => {
  it("isolates ownership and makes file creation idempotent", async () => {
    const metadata = makeInMemoryMetadataStore();
    const expectedScope = scope();
    await Effect.runPromise(metadata.createWorkspace({ ...expectedScope, state: "created" }));
    const first = await Effect.runPromise(metadata.createFile(fileRecord()));
    const second = await Effect.runPromise(
      metadata.createFile({ ...fileRecord(), fileId: UUIDS.otherFile }),
    );
    expect(second.fileId).toBe(first.fileId);

    await expect(
      Effect.runPromise(metadata.getFile({ ...expectedScope, userId: "other-user" }, first.fileId)),
    ).rejects.toBeInstanceOf(FileRecordNotFoundError);
  });
});
