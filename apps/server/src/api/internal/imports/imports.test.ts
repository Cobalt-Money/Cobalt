import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@cobalt-web/auth"), () => ({
  auth: {
    api: {
      getSession: vi.fn(() =>
        Promise.resolve({
          session: { id: "sess-1" },
          user: { email: "u@test", id: "user-321" },
        }),
      ),
    },
  } as never,
}));

vi.mock(import("@cobalt-web/server-data/subscriptions"), () => ({
  userHasActiveSubscription: vi.fn(() => Promise.resolve(true)),
}));

vi.mock(import("@cobalt-web/server-data/import/shared/queries"), () => ({
  assertOwnedJob: vi.fn(),
  getImportJobStatus: vi.fn(),
  getRejectedRows: vi.fn(() => Promise.resolve([])),
}));
vi.mock(import("@cobalt-web/server-data/import/shared/mutations"), () => ({
  markImportJobCancelled: vi.fn(),
  markImportJobFailed: vi.fn(),
  requestCancel: vi.fn(),
  setProgress: vi.fn(),
}));
vi.mock(import("@cobalt-web/server-data/import/upload/queries"), () => ({
  getRawRowsHeaders: vi.fn(() => Promise.resolve([])),
  getRawSampleRows: vi.fn(() => Promise.resolve([])),
}));
vi.mock(import("@cobalt-web/server-data/import/column-mapping/actions"), () => ({
  confirmColumnMapping: vi.fn(),
}));
vi.mock(import("@cobalt-web/server-data/import/column-mapping/cache"), () => ({
  cacheConfirmedMapping: vi.fn(),
  lookupColumnMappingCache: vi.fn(() => Promise.resolve(null)),
}));
vi.mock(import("@cobalt-web/server-data/import/account-mapping/actions"), () => ({
  confirmAccountMapping: vi.fn(),
}));
vi.mock(import("@cobalt-web/server-data/import/account-mapping/cache"), () => ({
  cacheAccountChoice: vi.fn(),
  lookupAccountMappingCache: vi.fn(() => Promise.resolve(new Map())),
}));
vi.mock(import("@cobalt-web/server-data/import/account-mapping/queries"), () => ({
  getStagedAccountLabels: vi.fn(() => Promise.resolve([])),
}));
vi.mock(import("@cobalt-web/server-data/import/category-mapping/actions"), () => ({
  confirmCategoryMapping: vi.fn(),
}));
vi.mock(import("@cobalt-web/server-data/import/category-mapping/cache"), () => ({
  cacheCategoryChoice: vi.fn(),
  lookupCategoryMappingCache: vi.fn(() => Promise.resolve(new Map())),
}));
vi.mock(import("@cobalt-web/server-data/import/category-mapping/queries"), () => ({
  getStagedCategoryLabels: vi.fn(() => Promise.resolve([])),
}));
vi.mock(import("../../../ai/agents/csv-column-mapping/csv-column-mapping-agent.js"), () => ({
  runCsvColumnMappingAgent: vi.fn(),
}));
vi.mock(import("../../../ai/agents/csv-account-mapping/csv-account-mapping-agent.js"), () => ({
  runCsvAccountMappingAgent: vi.fn(() => Promise.resolve([])),
}));
vi.mock(import("../../../ai/agents/csv-category-mapping/csv-category-mapping-agent.js"), () => ({
  runCsvCategoryMappingAgent: vi.fn(() => Promise.resolve([])),
}));

vi.mock(import("workflow/api"), () => ({
  start: vi.fn(() => Promise.resolve({ runId: "run-1" } as never)),
}));

const { getImportJobStatus } = await import("@cobalt-web/server-data/import/shared/queries");
const { importsRouter } = await import("./index.js");

const mockStatus = vi.mocked(getImportJobStatus);

const JOB_ID = "11111111-1111-4111-8111-111111111111";

function jobStatus(overrides: Partial<Awaited<ReturnType<typeof getImportJobStatus>>> = {}) {
  return {
    errorMessage: null,
    id: JOB_ID,
    originalFilename: null,
    progress: null,
    rejectedRows: 0,
    source: "csv" as const,
    status: "category_mapped" as const,
    summary: null,
    totalRows: 0,
    ...overrides,
  };
}

describe("imports router — commit guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when job is `category_mapped`", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ status: "category_mapped" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("returns 404 when job is missing", async () => {
    mockStatus.mockResolvedValueOnce(null);
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("returns 409 when job is `uploaded` (mapping not yet done)", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ status: "uploaded" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("uploaded");
  });

  it("returns 409 when job is already `committed`", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ status: "committed" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(409);
  });

  it("returns 409 when job is `failed`", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ errorMessage: "boom", status: "failed" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(409);
  });
});
