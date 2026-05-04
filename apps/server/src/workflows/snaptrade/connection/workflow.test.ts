import { ALERT_SOURCES, ALERT_TYPES } from "@cobalt-web/db/schema/users/alerts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { insertAlertStep, resolveAlertsStep } from "../../shared/alert-steps";
import {
  deleteSnaptradeAuthorizationStep,
  fetchAccountsStep,
  getAuthorizationDisplayNameStep,
  getSnapTradeUserCredentialsStep,
  syncAccountBalancesStep,
  syncAccountDetailsStep,
  syncAccountOrdersStep,
  syncAccountPositionsStep,
  syncBrokerageAccountStep,
  syncRecentActivitiesStep,
  updateAuthorizationStatusStep,
  upsertAccountDetailsStep,
  upsertAccountsStep,
  upsertSnaptradeAuthorizationStep,
} from "./steps";
import {
  snaptradeConnectionAddedWorkflow,
  snaptradeConnectionBrokenWorkflow,
  snaptradeConnectionDeletedWorkflow,
  snaptradeConnectionFixedWorkflow,
  snaptradeConnectionUpdatedWorkflow,
  snaptradeHoldingsUpdatedWorkflow,
} from "./workflow";

vi.mock(import("./steps"), () => ({
  deleteSnaptradeAuthorizationStep: vi.fn(),
  fetchAccountsStep: vi.fn(),
  getAuthorizationDisplayNameStep: vi.fn(),
  getSnapTradeUserCredentialsStep: vi.fn(),
  syncAccountBalancesStep: vi.fn(),
  syncAccountDetailsStep: vi.fn(),
  syncAccountOrdersStep: vi.fn(),
  syncAccountPositionsStep: vi.fn(),
  syncBrokerageAccountStep: vi.fn(),
  syncRecentActivitiesStep: vi.fn(),
  updateAuthorizationStatusStep: vi.fn(),
  upsertAccountDetailsStep: vi.fn(),
  upsertAccountsStep: vi.fn(),
  upsertSnaptradeAuthorizationStep: vi.fn(),
}));

vi.mock(import("../../shared/alert-steps"), () => ({
  insertAlertStep: vi.fn(),
  resolveAlertsStep: vi.fn(),
}));

vi.mock(import("../../shared/steps"), () => ({
  captureWorkflowExceptionStep: vi.fn(),
  toSerializableError: vi.fn((e) => ({
    message: e instanceof Error ? e.message : "x",
  })),
}));

const credentials = { appUserId: "app-user-1", userSecret: "secret" } as never;

describe("snaptradeConnectionAddedWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSnapTradeUserCredentialsStep).mockResolvedValue(credentials);
    vi.mocked(upsertSnaptradeAuthorizationStep).mockResolvedValue("auth-db-1");
    vi.mocked(fetchAccountsStep).mockResolvedValue([{ id: "acct-1" }] as never);
  });

  it("upserts authorization then accounts on happy path", async () => {
    const out = await snaptradeConnectionAddedWorkflow({
      brokerageAuthorizationId: "auth-1",
      brokerageId: "broker-1",
      userId: "user-1",
    });

    expect(upsertSnaptradeAuthorizationStep).toHaveBeenCalledWith(
      "auth-1",
      "app-user-1",
      "broker-1",
    );
    expect(fetchAccountsStep).toHaveBeenCalledWith(credentials);
    expect(upsertAccountsStep).toHaveBeenCalledWith([{ id: "acct-1" }], "auth-db-1", "app-user-1");
    expect(out).toStrictEqual({
      eventType: "CONNECTION_ADDED",
      success: true,
      userId: "user-1",
    });
  });

  it("returns success:false and captures exception when a step throws", async () => {
    vi.mocked(fetchAccountsStep).mockRejectedValueOnce(new Error("snap api"));
    const out = await snaptradeConnectionAddedWorkflow({
      brokerageAuthorizationId: "auth-1",
      brokerageId: "broker-1",
      userId: "user-1",
    });
    expect(out.success).toBeFalsy();
    expect(out.error).toBe("snap api");
  });
});

describe("snaptradeConnectionUpdatedWorkflow / FixedWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSnapTradeUserCredentialsStep).mockResolvedValue(credentials);
    vi.mocked(fetchAccountsStep).mockResolvedValue([] as never);
  });

  it.each([
    ["UPDATED", snaptradeConnectionUpdatedWorkflow, "CONNECTION_UPDATED"] as const,
    ["FIXED", snaptradeConnectionFixedWorkflow, "CONNECTION_FIXED"] as const,
  ])(
    "%s: clears disabled flag, resolves alerts, refreshes accounts",
    async (_name, run, eventType) => {
      const out = await run({
        brokerageAuthorizationId: "auth-x",
        userId: "user-x",
      });
      expect(updateAuthorizationStatusStep).toHaveBeenCalledWith("auth-x", false);
      expect(resolveAlertsStep).toHaveBeenCalledWith({
        source: ALERT_SOURCES.SNAPTRADE,
        sourceId: "auth-x",
      });
      expect(upsertAccountsStep).toHaveBeenCalledWith([], "auth-x", "app-user-1");
      expect(out).toStrictEqual({ eventType, success: true, userId: "user-x" });
    },
  );
});

describe("snaptradeConnectionBrokenWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthorizationDisplayNameStep).mockResolvedValue("Schwab");
  });

  it("disables auth + opens connection-broken alert", async () => {
    const out = await snaptradeConnectionBrokenWorkflow({
      brokerageAuthorizationId: "auth-b",
      userId: "user-b",
    });
    expect(updateAuthorizationStatusStep).toHaveBeenCalledWith("auth-b", true);
    expect(insertAlertStep).toHaveBeenCalledWith(
      expect.objectContaining({
        source: ALERT_SOURCES.SNAPTRADE,
        sourceId: "auth-b",
        type: ALERT_TYPES.CONNECTION_BROKEN,
        userId: "user-b",
      }),
    );
    expect(out.success).toBeTruthy();
  });
});

describe("snaptradeConnectionDeletedWorkflow", () => {
  it("deletes auth row and resolves linked alerts", async () => {
    vi.clearAllMocks();
    const out = await snaptradeConnectionDeletedWorkflow({
      brokerageAuthorizationId: "auth-d",
      userId: "user-d",
    });
    expect(deleteSnaptradeAuthorizationStep).toHaveBeenCalledWith("auth-d");
    expect(resolveAlertsStep).toHaveBeenCalledWith({
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: "auth-d",
    });
    expect(out.success).toBeTruthy();
  });
});

describe("snaptradeHoldingsUpdatedWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSnapTradeUserCredentialsStep).mockResolvedValue(credentials);
    vi.mocked(upsertSnaptradeAuthorizationStep).mockResolvedValue("auth-db-2");
    vi.mocked(syncAccountDetailsStep).mockResolvedValue({
      data: { id: "acct-1", name: "Brokerage" },
      success: true,
    } as never);
    vi.mocked(syncAccountBalancesStep).mockResolvedValue({
      success: true,
    } as never);
    vi.mocked(syncAccountPositionsStep).mockResolvedValue({
      positionCount: 1,
      success: true,
    } as never);
    vi.mocked(syncAccountOrdersStep).mockResolvedValue({
      orderCount: 0,
      success: true,
    } as never);
    vi.mocked(syncRecentActivitiesStep).mockResolvedValue({
      success: true,
    } as never);
  });

  it("syncs balances + positions + orders + activities when details succeed", async () => {
    const out = await snaptradeHoldingsUpdatedWorkflow({
      accountId: "acct-1",
      brokerageAuthorizationId: "auth-h",
      details: undefined,
      userId: "user-h",
    } as never);

    expect(syncBrokerageAccountStep).toHaveBeenCalledWith(
      "acct-1",
      "auth-db-2",
      credentials,
      expect.objectContaining({ id: "acct-1" }),
    );
    expect(upsertAccountDetailsStep).toHaveBeenCalledWith(
      "acct-1",
      credentials,
      expect.objectContaining({ id: "acct-1" }),
    );
    expect(syncAccountBalancesStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(syncAccountPositionsStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(syncAccountOrdersStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(syncRecentActivitiesStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(out.success).toBeTruthy();
  });

  it("skips balance/position/order sync when details flag them failed", async () => {
    const out = await snaptradeHoldingsUpdatedWorkflow({
      accountId: "acct-1",
      brokerageAuthorizationId: "auth-h",
      details: {
        balances: { success: false },
        orders: { success: false },
        positions: { success: false },
      },
      userId: "user-h",
    } as never);

    expect(syncAccountBalancesStep).not.toHaveBeenCalled();
    expect(syncAccountPositionsStep).not.toHaveBeenCalled();
    expect(syncAccountOrdersStep).not.toHaveBeenCalled();
    // activities always run
    expect(syncRecentActivitiesStep).toHaveBeenCalledWith("acct-1", credentials);
    expect(out.success).toBeTruthy();
  });

  it("returns success:false when account details fetch fails", async () => {
    vi.mocked(syncAccountDetailsStep).mockResolvedValueOnce({
      success: false,
    } as never);
    const out = await snaptradeHoldingsUpdatedWorkflow({
      accountId: "acct-1",
      brokerageAuthorizationId: "auth-h",
      details: undefined,
      userId: "user-h",
    } as never);
    expect(out.success).toBeFalsy();
    expect(syncBrokerageAccountStep).not.toHaveBeenCalled();
  });
});
