import { beforeEach, describe, expect, it, vi } from "vitest";

const putMock = vi.fn<() => Promise<{ url: string }>>();
vi.mock(
  import("@vercel/blob"),
  () =>
    ({
      put: putMock,
    }) as never,
);

const limitMock = vi.fn<() => Promise<{ id: string }[]>>().mockResolvedValue([]);
const whereSelectMock = vi.fn(() => ({ limit: limitMock }));
const fromMock = vi.fn(() => ({ where: whereSelectMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

const returningMock = vi
  .fn<() => Promise<{ id: string }[]>>()
  .mockResolvedValue([{ id: "job-123" }]);
const valuesMock = vi.fn(() => ({ returning: returningMock }));
const insertMock = vi.fn(() => ({ values: valuesMock }));

const updateWhereMock = vi.fn<() => Promise<void>>().mockResolvedValue();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));

vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        insert: insertMock,
        select: selectMock,
        update: updateMock,
      },
    }) as never,
);
vi.mock(
  import("@cobalt-web/db/schema/imports/import-job"),
  () =>
    ({
      importJob: {
        createdAt: "created_at",
        fileHash: "file_hash",
        id: "id",
        userId: "user_id",
      },
    }) as never,
);
vi.mock(
  import("@cobalt-web/env/server"),
  () =>
    ({
      env: { BLOB_READ_WRITE_TOKEN: "test-token" },
    }) as never,
);

const { uploadAndStageImport } = await import("./actions.js");

function csvBuffer(): Buffer {
  // Header row + 25 data rows (gates require ≥1 row + ≥3 named columns).
  const lines = ["Date,Amount,Description"];
  for (let i = 0; i < 25; i += 1) {
    lines.push(
      `2026-01-${String((i % 28) + 1).padStart(2, "0")},-${String(i + 1)}.00,Item ${String(i)}`,
    );
  }
  return Buffer.from(`${lines.join("\n")}\n`, "utf-8");
}

describe("uploadAndStageImport", () => {
  beforeEach(() => {
    putMock.mockReset();
    putMock.mockResolvedValue({ url: "https://blob.example/u-1/imports/job-123.csv" });
    limitMock.mockReset();
    limitMock.mockResolvedValue([]);
    valuesMock.mockClear();
    returningMock.mockClear();
    returningMock.mockResolvedValue([{ id: "job-123" }]);
    insertMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
    whereSelectMock.mockClear();
    updateMock.mockClear();
    updateSetMock.mockClear();
    updateWhereMock.mockClear();
  });

  it("uploads to {userId}/imports/{jobId}.csv and persists headers + sampleRows", async () => {
    const result = await uploadAndStageImport({
      buffer: csvBuffer(),
      filename: "test.csv",
      userId: "u-1",
    });

    expect(result.jobId).toBe("job-123");
    expect(result.headers).toStrictEqual(["Date", "Amount", "Description"]);
    expect(result.totalRows).toBe(25);
    expect(result.sampleRows).toHaveLength(20);

    expect(putMock).toHaveBeenCalledOnce();
    const [path, body, opts] = putMock.mock.calls[0] as unknown as [
      string,
      Buffer,
      Record<string, unknown>,
    ];
    expect(path).toBe("u-1/imports/job-123.csv");
    expect(Buffer.isBuffer(body)).toBeTruthy();
    expect(opts).toMatchObject({
      access: "public",
      contentType: "text/csv",
      token: "test-token",
    });

    const [insertedRow] = valuesMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertedRow.headers).toStrictEqual(["Date", "Amount", "Description"]);
    expect(insertedRow.sampleRows as unknown[]).toHaveLength(20);
    expect(insertedRow.userId).toBe("u-1");

    expect(updateSetMock).toHaveBeenCalledWith({
      fileKey: "https://blob.example/u-1/imports/job-123.csv",
    });
  });

  it("rejects duplicate uploads within the 30-day window without calling put", async () => {
    limitMock.mockResolvedValueOnce([{ id: "prior-job" }]);
    await expect(
      uploadAndStageImport({ buffer: csvBuffer(), filename: "test.csv", userId: "u-1" }),
    ).rejects.toThrow(/already imported/);
    expect(putMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
