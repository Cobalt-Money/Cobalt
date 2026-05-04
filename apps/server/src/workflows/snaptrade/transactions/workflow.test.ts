import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAllActivitiesStep,
  fetchIncrementalActivitiesStep,
  getSnapTradeUserCredentialsStep,
  refreshAccountDataStep,
  upsertActivitiesStep,
} from "./steps";
import {
  snaptradeTransactionsInitialWorkflow,
  snaptradeTransactionsUpdatedWorkflow,
} from "./workflow";

vi.mock(import("./steps"), () => ({
  fetchAllActivitiesStep: vi.fn(),
  fetchIncrementalActivitiesStep: vi.fn(),
  getSnapTradeUserCredentialsStep: vi.fn(),
  refreshAccountDataStep: vi.fn(),
  upsertActivitiesStep: vi.fn(),
}));

vi.mock(import("../../shared/steps"), () => ({
  captureWorkflowExceptionStep: vi.fn(),
  toSerializableError: vi.fn((e) => ({
    message: e instanceof Error ? e.message : "x",
  })),
}));

const credentials = { appUserId: "app-user-1", userSecret: "secret" } as never;

describe("snaptradeTransactionsInitialWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSnapTradeUserCredentialsStep).mockResolvedValue(credentials);
    vi.mocked(fetchAllActivitiesStep).mockResolvedValue({
      activities: [{ id: "a1" }, { id: "a2" }],
    } as never);
  });

  it("fetches all activities, upserts, then refreshes account", async () => {
    const out = await snaptradeTransactionsInitialWorkflow({
      accountId: "acct-1",
      userId: "user-1",
    } as never);

    expect(fetchAllActivitiesStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(upsertActivitiesStep).toHaveBeenCalledWith("acct-1", "app-user-1", [
      { id: "a1" },
      { id: "a2" },
    ]);
    expect(refreshAccountDataStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(out).toStrictEqual({
      eventType: "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE",
      success: true,
      userId: "user-1",
    });
  });

  it("returns success:false on step failure", async () => {
    vi.mocked(upsertActivitiesStep).mockRejectedValueOnce(new Error("db err"));
    const out = await snaptradeTransactionsInitialWorkflow({
      accountId: "acct-1",
      userId: "user-1",
    } as never);
    expect(out.success).toBeFalsy();
    expect(out.error).toBe("db err");
  });
});

describe("snaptradeTransactionsUpdatedWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSnapTradeUserCredentialsStep).mockResolvedValue(credentials);
  });

  it("uses incremental activities when lastSyncDate is present", async () => {
    vi.mocked(fetchIncrementalActivitiesStep).mockResolvedValueOnce({
      activities: [{ id: "i1" }],
      lastSyncDate: "2026-01-01",
    } as never);

    const out = await snaptradeTransactionsUpdatedWorkflow({
      accountId: "acct-2",
      userId: "user-2",
    } as never);

    expect(fetchAllActivitiesStep).not.toHaveBeenCalled();
    expect(upsertActivitiesStep).toHaveBeenCalledWith("acct-2", "app-user-1", [{ id: "i1" }]);
    expect(out.success).toBeTruthy();
  });

  it("falls back to full sync when lastSyncDate is null", async () => {
    vi.mocked(fetchIncrementalActivitiesStep).mockResolvedValueOnce({
      activities: [],
      lastSyncDate: null,
    } as never);
    vi.mocked(fetchAllActivitiesStep).mockResolvedValueOnce({
      activities: [{ id: "full-1" }, { id: "full-2" }],
    } as never);

    const out = await snaptradeTransactionsUpdatedWorkflow({
      accountId: "acct-2",
      userId: "user-2",
    } as never);

    expect(fetchAllActivitiesStep).toHaveBeenCalledWith("acct-2", credentials);
    expect(upsertActivitiesStep).toHaveBeenCalledWith("acct-2", "app-user-1", [
      { id: "full-1" },
      { id: "full-2" },
    ]);
    expect(out.success).toBeTruthy();
  });
});
