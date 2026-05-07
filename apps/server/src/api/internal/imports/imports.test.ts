import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@cobalt-web/auth"), () => ({
  auth: {
    api: {
      getSession: vi.fn(() =>
        Promise.resolve({
          session: { id: "sess-1" },
          user: { email: "u@test", id: "user-317" },
        }),
      ),
    },
  } as never,
}));

vi.mock(import("@cobalt-web/server-data/subscriptions"), () => ({
  userHasActiveSubscription: vi.fn(() => Promise.resolve(true)),
}));

vi.mock(import("@cobalt-web/server-data/import/queries"), () => ({
  getImportJobStatus: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/import/mutations"), () => ({
  setAccountMap: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/import/upload"), () => ({
  uploadAndStageImport: vi.fn(),
}));

vi.mock(import("workflow/api"), () => ({
  start: vi.fn(() => Promise.resolve({ runId: "run-1" } as never)),
}));

const { getImportJobStatus } = await import("@cobalt-web/server-data/import/queries");
const { importsRouter } = await import("./index.js");

const mockStatus = vi.mocked(getImportJobStatus);

const JOB_ID = "11111111-1111-4111-8111-111111111111";

function jobStatus(overrides: Partial<Awaited<ReturnType<typeof getImportJobStatus>>> = {}) {
  return {
    accounts: [],
    categories: [],
    currentMapping: null,
    dupeCount: 0,
    errorMessage: null,
    id: JOB_ID,
    importCount: 0,
    source: "mint" as const,
    status: "mapped" as const,
    ...overrides,
  };
}

describe("imports router — commit guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when job is `mapped`", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ status: "mapped" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("returns 404 when job is missing", async () => {
    mockStatus.mockResolvedValueOnce(null);
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("returns 409 when job is `parsed` (mapping not yet submitted)", async () => {
    mockStatus.mockResolvedValueOnce(jobStatus({ status: "parsed" }));
    const res = await importsRouter.request(`/${JOB_ID}/commit`, { method: "POST" });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("parsed");
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
