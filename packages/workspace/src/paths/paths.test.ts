import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { scope, UUIDS } from "../testing/index.js";
import { makeObjectKey, parseObjectKey, parseWorkspacePath } from "./index.js";

describe("workspace paths", () => {
  it("rejects traversal, malformed separators, and unmounted paths", async () => {
    const invalidPaths = [
      "workspace/file.txt",
      "/workspace/../secret",
      "/workspace//file",
      "/workspace\\file",
      "/workspace-other/file",
      "/tmp/file",
    ];
    for (const path of invalidPaths) {
      await expect(Effect.runPromise(parseWorkspacePath(path, "read"))).rejects.toMatchObject({
        _tag: "WorkspacePathError",
      });
    }
  });

  it("rejects writes to uploads", async () => {
    await expect(
      Effect.runPromise(parseWorkspacePath("/mnt/uploads/input.csv", "write")),
    ).rejects.toMatchObject({ _tag: "WorkspacePathError" });
  });

  it("accepts a canonical mounted path", async () => {
    await expect(
      Effect.runPromise(parseWorkspacePath("/workspace/src/index.ts", "read")),
    ).resolves.toMatchObject({ path: "/workspace/src/index.ts" });
  });
});

describe("object keys", () => {
  it("round-trips only inside the expected scope", async () => {
    const expected = scope();
    const key = makeObjectKey(expected, "uploads", UUIDS.file);
    await expect(Effect.runPromise(parseObjectKey(key, expected))).resolves.toMatchObject({
      fileId: UUIDS.file,
      kind: "uploads",
      scope: expected,
    });

    await expect(
      Effect.runPromise(parseObjectKey(key, { ...expected, userId: "another-user" })),
    ).rejects.toMatchObject({ _tag: "ObjectKeyError" });
    await expect(
      Effect.runPromise(parseObjectKey(key, { ...expected, workspaceId: UUIDS.otherWorkspace })),
    ).rejects.toMatchObject({ _tag: "ObjectKeyError" });
  });
});
