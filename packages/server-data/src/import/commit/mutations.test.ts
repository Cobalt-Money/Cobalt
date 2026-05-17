import { beforeEach, describe, expect, it, vi } from "vitest";

const delMock = vi.fn<() => Promise<void>>().mockResolvedValue();
vi.mock(
  import("@vercel/blob"),
  () =>
    ({
      del: delMock,
    }) as never,
);

const findFirstMock = vi.fn<() => Promise<{ fileKey: string | null } | null>>();
const whereMock = vi.fn<() => Promise<void>>().mockResolvedValue();
const setMock = vi.fn(() => ({ where: whereMock }));
const updateMock = vi.fn(() => ({ set: setMock }));
const executeMock = vi.fn<() => Promise<void>>().mockResolvedValue();
vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        execute: executeMock,
        query: { importJob: { findFirst: findFirstMock } },
        update: updateMock,
      },
    }) as never,
);
vi.mock(
  import("@cobalt-web/db/schema/imports/import-job"),
  () =>
    ({
      importJob: { id: "id" },
    }) as never,
);
vi.mock(
  import("@cobalt-web/env/server"),
  () =>
    ({
      env: { BLOB_READ_WRITE_TOKEN: "test-token" },
    }) as never,
);

const { finalizeCommit } = await import("./mutations.js");

const summary = { duplicates: 0, excluded: 0, failed: 0, imported: 5, rejected: [] };

describe("finalizeCommit", () => {
  beforeEach(() => {
    delMock.mockReset();
    delMock.mockResolvedValue(undefined as never);
    findFirstMock.mockReset();
    setMock.mockClear();
    updateMock.mockClear();
    whereMock.mockClear();
  });

  it("deletes the upload blob when fileKey is set", async () => {
    findFirstMock.mockResolvedValue({ fileKey: "https://blob.example/imports/u/j.csv" });
    await finalizeCommit("job-1", summary);
    expect(delMock).toHaveBeenCalledWith("https://blob.example/imports/u/j.csv", {
      token: "test-token",
    });
    expect(setMock).toHaveBeenCalledWith({
      fileKey: null,
      status: "committed",
      summary,
    });
  });

  it("skips blob deletion when fileKey is null", async () => {
    findFirstMock.mockResolvedValue({ fileKey: null });
    await finalizeCommit("job-2", summary);
    expect(delMock).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledOnce();
  });

  it("swallows blob deletion errors so commit still finalizes", async () => {
    findFirstMock.mockResolvedValue({ fileKey: "https://blob.example/x.csv" });
    delMock.mockRejectedValue(new Error("blob 404"));
    await expect(finalizeCommit("job-3", summary)).resolves.toBeUndefined();
    expect(setMock).toHaveBeenCalledOnce();
  });
});
