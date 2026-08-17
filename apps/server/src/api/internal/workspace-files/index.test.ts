import { createHash } from "node:crypto";
// oxlint-disable class-methods-use-this, max-classes-per-file, no-await-expression-member, no-throw-literal, require-await -- Complete in-memory adapters keep route tests deterministic and provider-neutral.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileRecord, StorageObjectMetadata } from "./_shared/schemas.js";
import type { WorkspaceFilesMetadataAdapter, WorkspaceFilesObjectStorageAdapter } from "./index.js";

const getSessionMock = vi.fn();
vi.mock(
  import("@cobalt-web/auth"),
  () => ({ auth: { api: { getSession: getSessionMock } } }) as never,
);
vi.mock(
  import("@cobalt-web/server-data/subscriptions"),
  () => ({ userHasActiveSubscription: vi.fn() }) as never,
);

const { createWorkspaceFilesRouter } = await import("./index.js");
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_FILE_ID = "00000000-0000-4000-8000-000000000004";
const BYTES = new TextEncoder().encode("pdf");
const CHECKSUM = `sha256:${createHash("sha256").update(BYTES).digest("hex")}`;
const JSON_HEADERS = { "Content-Type": "application/json" };

class FakeMetadata implements WorkspaceFilesMetadataAdapter {
  readonly files = new Map<string, FileRecord>();
  readonly workspaces = new Set([`user-1:${WORKSPACE_ID}`]);

  async createFile(record: FileRecord): Promise<FileRecord> {
    const existing = [...this.files.values()].find(
      (file) => file.idempotencyKey && file.idempotencyKey === record.idempotencyKey,
    );
    if (existing) {
      return { ...existing };
    }
    this.files.set(this.key(record.userId, record.workspaceId, record.fileId), { ...record });
    return { ...record };
  }
  async deleteFile(userId: string, workspaceId: string, fileId: string): Promise<void> {
    if (!this.files.delete(this.key(userId, workspaceId, fileId))) {
      throw { _tag: "FileRecordNotFoundError" };
    }
  }
  async getFile(userId: string, workspaceId: string, fileId: string): Promise<FileRecord> {
    const file = this.files.get(this.key(userId, workspaceId, fileId));
    if (!file) {
      throw { _tag: "FileRecordNotFoundError" };
    }
    return { ...file };
  }
  async getWorkspace(userId: string, workspaceId: string): Promise<void> {
    if (!this.workspaces.has(`${userId}:${workspaceId}`)) {
      throw { _tag: "WorkspaceNotFoundError" };
    }
  }
  async listFiles(userId: string, workspaceId: string): Promise<readonly FileRecord[]> {
    return [...this.files.values()].filter(
      (file) => file.userId === userId && file.workspaceId === workspaceId,
    );
  }
  async transitionFile(
    userId: string,
    workspaceId: string,
    fileId: string,
    state: FileRecord["state"],
  ): Promise<FileRecord> {
    const file = await this.getFile(userId, workspaceId, fileId);
    if (file.state !== "pending" || state !== "ready") {
      throw { _tag: "InvalidStateTransitionError" };
    }
    const updated = { ...file, state, updatedAt: new Date().toISOString() };
    this.files.set(this.key(userId, workspaceId, fileId), updated);
    return updated;
  }
  private key(userId: string, workspaceId: string, fileId: string): string {
    return `${userId}:${workspaceId}:${fileId}`;
  }
}

class FakeStorage implements WorkspaceFilesObjectStorageAdapter {
  readonly objects = new Map<string, { bytes: Uint8Array; metadata: StorageObjectMetadata }>();
  async delete(_userId: string, _workspaceId: string, objectKey: string): Promise<void> {
    if (!this.objects.delete(objectKey)) {
      throw { _tag: "StorageObjectNotFoundError" };
    }
  }
  async head(
    _userId: string,
    _workspaceId: string,
    objectKey: string,
  ): Promise<StorageObjectMetadata> {
    const object = this.objects.get(objectKey);
    if (!object) {
      throw { _tag: "StorageObjectNotFoundError" };
    }
    return { ...object.metadata };
  }
  async put(
    _userId: string,
    _workspaceId: string,
    objectKey: string,
    bytes: Uint8Array,
    metadata: StorageObjectMetadata,
  ): Promise<void> {
    this.objects.set(objectKey, { bytes: Uint8Array.from(bytes), metadata: { ...metadata } });
  }
  async read(_userId: string, _workspaceId: string, objectKey: string): Promise<Uint8Array> {
    const object = this.objects.get(objectKey);
    if (!object) {
      throw { _tag: "StorageObjectNotFoundError" };
    }
    return Uint8Array.from(object.bytes);
  }
}

const harness = () => {
  const metadata = new FakeMetadata();
  const storage = new FakeStorage();
  const createDirectUpload = vi.fn(async ({ objectKey }: { objectKey: string }) => ({
    headers: { "x-upload-key": objectKey },
    method: "PUT" as const,
    url: "https://uploads.example/direct",
  }));
  return {
    createDirectUpload,
    metadata,
    router: createWorkspaceFilesRouter({ createDirectUpload, metadata, storage }),
    storage,
  };
};
const initialize = (
  router: ReturnType<typeof harness>["router"],
  overrides: Record<string, unknown> = {},
) =>
  router.request(`/${WORKSPACE_ID}/uploads`, {
    body: JSON.stringify({
      checksum: CHECKSUM,
      contentType: "application/pdf",
      fileName: "statement.pdf",
      size: 3,
      ...overrides,
    }),
    headers: JSON_HEADERS,
    method: "POST",
  });
const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("workspace files router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ session: { id: "session-1" }, user: { id: "user-1" } });
  });

  it("returns stable unauthorized and cross-workspace errors", async () => {
    const { metadata, router } = harness();
    getSessionMock.mockResolvedValueOnce(null);
    const unauthorized = await router.request(`/${WORKSPACE_ID}/files`);
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toStrictEqual({
      code: "unauthorized",
      error: "Unauthorized",
    });
    metadata.workspaces.delete(`user-1:${WORKSPACE_ID}`);
    metadata.workspaces.add(`user-2:${WORKSPACE_ID}`);
    const foreign = await router.request(`/${WORKSPACE_ID}/files`);
    expect(foreign.status).toBe(404);
    await expect(foreign.json()).resolves.toStrictEqual({
      code: "workspace_not_found",
      error: "Workspace not found",
    });
  });

  it.each([
    [{ fileName: "../statement.pdf" }, "fileName"],
    [{ contentType: "application/x-msdownload" }, "contentType"],
    [{ size: 0 }, "size"],
    [{ size: 25 * 1024 * 1024 + 1 }, "size"],
    [{ checksum: "bad" }, "checksum"],
  ])("rejects invalid upload metadata %#", async (overrides, field) => {
    const response = await initialize(harness().router, overrides);
    expect(response.status).toBe(422);
    expect(JSON.stringify(await response.json())).toContain(field);
  });

  it("initializes proxy and direct uploads with stable chat references", async () => {
    const { createDirectUpload, router } = harness();
    const proxy = await initialize(router);
    expect(proxy.status).toBe(201);
    await expect(json(proxy)).resolves.toMatchObject({
      file: {
        name: "statement.pdf",
        reference: { fileId: expect.any(String), workspaceId: WORKSPACE_ID },
        state: "pending",
      },
      upload: {
        method: "PUT",
        mode: "proxy",
        objectKey: expect.stringContaining(`/workspaces/${WORKSPACE_ID}/uploads/`),
        url: expect.stringMatching(/\/uploads\/[0-9a-f-]+$/),
      },
    });
    const direct = await initialize(router, { idempotencyKey: "direct", uploadMode: "direct" });
    expect(direct.status).toBe(201);
    await expect(json(direct)).resolves.toMatchObject({
      upload: { mode: "direct", url: "https://uploads.example/direct" },
    });
    expect(createDirectUpload).toHaveBeenCalledOnce();
  });

  it("completes proxy upload, confirmation, list, metadata, download, and delete", async () => {
    const { router } = harness();
    const initialized = await json(await initialize(router));
    const file = initialized.file as { reference: { fileId: string } };
    const upload = initialized.upload as { objectKey: string; url: string };
    expect(
      (
        await router.request(upload.url, {
          body: BYTES,
          headers: { "Content-Type": "application/pdf" },
          method: "PUT",
        })
      ).status,
    ).toBe(204);
    const confirmed = await router.request(
      `/${WORKSPACE_ID}/uploads/${file.reference.fileId}/confirm`,
      {
        body: JSON.stringify({ objectKey: upload.objectKey }),
        headers: JSON_HEADERS,
        method: "POST",
      },
    );
    expect(confirmed.status).toBe(200);
    await expect((await router.request(`/${WORKSPACE_ID}/files`)).json()).resolves.toMatchObject({
      files: [{ state: "ready" }],
    });
    await expect(
      (await router.request(`/${WORKSPACE_ID}/files/${file.reference.fileId}`)).json(),
    ).resolves.toMatchObject({ file: { name: "statement.pdf" } });
    const downloaded = await router.request(
      `/${WORKSPACE_ID}/files/${file.reference.fileId}/download`,
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get("content-disposition")).toBe(
      'attachment; filename="statement.pdf"',
    );
    expect(new Uint8Array(await downloaded.arrayBuffer())).toStrictEqual(BYTES);
    expect(
      (
        await router.request(`/${WORKSPACE_ID}/files/${file.reference.fileId}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    expect((await router.request(`/${WORKSPACE_ID}/files/${file.reference.fileId}`)).status).toBe(
      404,
    );
  });

  it("supports direct confirmation and rejects duplicate confirmation", async () => {
    const { router, storage } = harness();
    const initialized = await json(await initialize(router, { uploadMode: "direct" }));
    const file = initialized.file as { reference: { fileId: string } };
    const upload = initialized.upload as { objectKey: string };
    await storage.put("user-1", WORKSPACE_ID, upload.objectKey, BYTES, {
      checksum: CHECKSUM,
      contentType: "application/pdf",
      size: 3,
    });
    const confirm = () =>
      router.request(`/${WORKSPACE_ID}/uploads/${file.reference.fileId}/confirm`, {
        body: JSON.stringify({ objectKey: upload.objectKey }),
        headers: JSON_HEADERS,
        method: "POST",
      });
    expect((await confirm()).status).toBe(200);
    const duplicate = await confirm();
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toStrictEqual({
      code: "upload_already_confirmed",
      error: "Upload already confirmed",
    });
  });

  it("rejects foreign object keys and returns stable missing-file errors", async () => {
    const { router } = harness();
    const initialized = await json(await initialize(router));
    const file = initialized.file as { reference: { fileId: string } };
    const upload = initialized.upload as { objectKey: string };
    const invalidKeys = [
      upload.objectKey.replace(WORKSPACE_ID, OTHER_WORKSPACE_ID),
      upload.objectKey.replace(file.reference.fileId, OTHER_FILE_ID),
    ];
    for (const objectKey of invalidKeys) {
      const response = await router.request(
        `/${WORKSPACE_ID}/uploads/${file.reference.fileId}/confirm`,
        {
          body: JSON.stringify({ objectKey }),
          headers: JSON_HEADERS,
          method: "POST",
        },
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({
        code: "invalid_object_key",
        error: "Object key does not match the file",
      });
    }
    const missing = await router.request(`/${WORKSPACE_ID}/files/${OTHER_FILE_ID}`);
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toStrictEqual({
      code: "file_not_found",
      error: "File not found",
    });
  });
});
