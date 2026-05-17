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
  deleteImportJob: vi.fn(),
  markImportJobCancelled: vi.fn(),
  markImportJobCommitting: vi.fn(),
  markImportJobFailed: vi.fn(),
  persistAccountSuggestions: vi.fn(),
  persistCategorySuggestions: vi.fn(),
  persistSchemaMapping: vi.fn(),
  requestCancel: vi.fn(),
  setProgress: vi.fn(),
  updateStagedRow: vi.fn(() => Promise.resolve(true)),
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
vi.mock(import("@cobalt-web/server-data/import/column-mapping/per-name-cache"), () => ({
  lookupColumnRoles: vi.fn(() => Promise.resolve(new Map())),
  reconstructMapping: vi.fn(() => null),
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
vi.mock(import("@cobalt-web/server-data/import/commit/pre-commit-gate"), () => ({
  runPreCommitGate: vi.fn(() => Promise.resolve({ blocked: false, reasons: [], warnings: [] })),
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
vi.mock(import("../../../ai/agents/import/csv-column-mapping/csv-column-mapping-agent.js"), () => ({
  runCsvColumnMappingAgent: vi.fn(),
}));
vi.mock(
  import("../../../ai/agents/import/csv-account-mapping/csv-account-mapping-agent.js"),
  () => ({
    runCsvAccountMappingAgent: vi.fn(() => Promise.resolve([])),
  }),
);
vi.mock(
  import("../../../ai/agents/import/csv-category-mapping/csv-category-mapping-agent.js"),
  () => ({
    runCsvCategoryMappingAgent: vi.fn(() => Promise.resolve([])),
  }),
);

vi.mock(import("workflow/api"), () => ({
  start: vi.fn(() => Promise.resolve({ runId: "run-1" } as never)),
}));

const { assertOwnedJob, getImportJobStatus } =
  await import("@cobalt-web/server-data/import/shared/queries");
const mockAssertOwnedJob = vi.mocked(assertOwnedJob);
const { getRawRowsHeaders, getRawSampleRows } =
  await import("@cobalt-web/server-data/import/upload/queries");
const { lookupColumnMappingCache } =
  await import("@cobalt-web/server-data/import/column-mapping/cache");
const { runCsvColumnMappingAgent } =
  await import("../../../ai/agents/import/csv-column-mapping/csv-column-mapping-agent.js");
const { runCsvAccountMappingAgent } =
  await import("../../../ai/agents/import/csv-account-mapping/csv-account-mapping-agent.js");
const { runCsvCategoryMappingAgent } =
  await import("../../../ai/agents/import/csv-category-mapping/csv-category-mapping-agent.js");
const { importsRouter } = await import("./index.js");
const { suggestAccountLabels } = await import("./account-map.js");
const { suggestCategoryLabels } = await import("./category-map.js");

const mockStatus = vi.mocked(getImportJobStatus);
const mockHeaders = vi.mocked(getRawRowsHeaders);
const mockSampleRows = vi.mocked(getRawSampleRows);
const mockLookupColumn = vi.mocked(lookupColumnMappingCache);
const mockColumnAgent = vi.mocked(runCsvColumnMappingAgent);
const mockAccountAgent = vi.mocked(runCsvAccountMappingAgent);
const mockCategoryAgent = vi.mocked(runCsvCategoryMappingAgent);

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

const cachedMapping = {
  account: null,
  amount: {
    column: "Amount",
    kind: "signed" as const,
    parensNegative: false,
    signConvention: "outflow_negative" as const,
  },
  category: null,
  confidence: 0.95,
  date: { column: "Date", format: "yyyy-MM-dd", kind: "column" as const },
  excludeRule: null,
  merchant: { column: "Description" },
  notes: null,
  originalDescription: null,
  tags: null,
  transferRule: null,
};

describe("imports router — column-mapping cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(["Date", "Description", "Amount"]);
    mockSampleRows.mockResolvedValue([{ Amount: "-1", Date: "2025-01-01", Description: "x" }]);
    mockAssertOwnedJob.mockResolvedValue({ schemaMapping: null } as never);
  });

  it("cache HIT: agent NOT called, response flagged fromCache:true", async () => {
    mockLookupColumn.mockResolvedValueOnce(cachedMapping);
    const res = await importsRouter.request(`/${JOB_ID}/column-map`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fromCache: boolean };
    expect(body.fromCache).toBeTruthy();
    expect(mockColumnAgent).not.toHaveBeenCalled();
  });

  it("cache MISS: agent IS called, response flagged fromCache:false", async () => {
    mockLookupColumn.mockResolvedValueOnce(null);
    mockColumnAgent.mockResolvedValueOnce(cachedMapping);
    const res = await importsRouter.request(`/${JOB_ID}/column-map`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fromCache: boolean };
    expect(body.fromCache).toBeFalsy();
    expect(mockColumnAgent).toHaveBeenCalledTimes(1);
  });
});

const userAccountsFixture = [
  {
    customName: null,
    id: "acc_chase",
    institutionName: "Chase",
    mask: "1234",
    name: "Chase Checking",
    officialName: null,
    subtype: "Checking",
    type: "depository",
  },
];

describe("suggestAccountLabels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls agent for labels with no cached decision", async () => {
    mockAccountAgent.mockResolvedValueOnce([]);
    await suggestAccountLabels("user-321", ["Chase Checking", "Amex Gold"], userAccountsFixture);
    expect(mockAccountAgent).toHaveBeenCalledTimes(1);
    expect(mockAccountAgent.mock.calls[0]?.[0].sourceLabels).toStrictEqual([
      "Chase Checking",
      "Amex Gold",
    ]);
  });
});

describe("suggestCategoryLabels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls agent for labels with no cached decision", async () => {
    mockCategoryAgent.mockResolvedValueOnce([]);
    await suggestCategoryLabels("user-321", ["A", "B", "C"], []);
    expect(mockCategoryAgent).toHaveBeenCalledTimes(1);
    expect(mockCategoryAgent.mock.calls[0]?.[0].sourceLabels).toStrictEqual(["A", "B", "C"]);
  });
});
