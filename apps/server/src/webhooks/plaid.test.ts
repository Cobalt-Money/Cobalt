import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHookByToken, resumeHook, start } from "workflow/api";

import {
  plaidHoldingsWorkflow,
  plaidInvestmentTransactionsWorkflow,
} from "../workflows/plaid/investments/workflow.js";
import { plaidItemWebhookWorkflow } from "../workflows/plaid/item/workflow.js";
import { plaidLiabilitiesSyncWorkflow } from "../workflows/plaid/liabilities/workflow.js";
import {
  plaidRecurringTransactionsWorkflow,
  plaidSyncWorkflow,
} from "../workflows/plaid/sync/workflow.js";
import { plaidWebhookRouter } from "./plaid.js";

vi.mock(import("workflow/api"), () => ({
  getHookByToken: vi.fn(),
  resumeHook: vi.fn(),
  start: vi.fn(),
}));

vi.mock(import("../workflows/plaid/investments/workflow.js"), () => ({
  plaidHoldingsWorkflow: vi.fn(),
  plaidInitialInvestmentSyncWorkflow: vi.fn(),
  plaidInvestmentTransactionsWorkflow: vi.fn(),
}));

vi.mock(import("../workflows/plaid/item/workflow.js"), () => ({
  plaidItemWebhookWorkflow: vi.fn(),
}));

vi.mock(import("../workflows/plaid/liabilities/workflow.js"), () => ({
  plaidLiabilitiesSyncWorkflow: vi.fn(),
}));

// Stub freeze gate + connection lookup; real impls hit Postgres which test env doesn't have.
vi.mock(import("@cobalt-web/server-data/subscriptions/limits"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isConnectionActiveForUser: vi.fn().mockResolvedValue(true),
  };
});
vi.mock(import("@cobalt-web/server-data/providers/plaid/link/queries"), () => ({
  lookupPlaidConnection: vi.fn().mockResolvedValue({ id: "conn1", userId: "u1" }),
}));

const mockGetHook = vi.mocked(getHookByToken);
const mockResume = vi.mocked(resumeHook);
const mockStart = vi.mocked(start);

function syncWebhookBody(itemId: string) {
  return {
    environment: "sandbox",
    historical_update_complete: true,
    initial_update_complete: true,
    item_id: itemId,
    webhook_code: "SYNC_UPDATES_AVAILABLE" as const,
    webhook_type: "TRANSACTIONS" as const,
  };
}

function postWebhook(body: unknown) {
  return plaidWebhookRouter.request("/", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("plaid webhook router — SYNC_UPDATES_AVAILABLE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-xyz" } as unknown as Awaited<
      ReturnType<typeof start>
    >);
  });

  it("resumes the waiting onboarding hook when one exists", async () => {
    mockGetHook.mockResolvedValue({
      runId: "run-onboarding",
    } as unknown as Awaited<ReturnType<typeof getHookByToken>>);

    const res = await postWebhook(syncWebhookBody("item-1"));
    expect(res.status).toBe(200);

    expect(mockGetHook).toHaveBeenCalledWith("plaid:sync:item-1");
    expect(mockResume).toHaveBeenCalledWith("plaid:sync:item-1", {
      historical_update_complete: true,
      initial_update_complete: true,
    });
    // When a hook is waiting, the recurring sync workflow must NOT start.
    expect(mockStart).not.toHaveBeenCalledWith(plaidSyncWorkflow, expect.anything());
  });

  it("falls back to starting plaidSyncWorkflow when no hook is waiting", async () => {
    mockGetHook.mockRejectedValue(new Error("Hook not found"));

    const res = await postWebhook(syncWebhookBody("item-2"));
    expect(res.status).toBe(200);

    expect(mockResume).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(plaidSyncWorkflow, [
      {
        historical_update_complete: true,
        initial_update_complete: true,
        item_id: "item-2",
      },
    ]);
  });

  it("does not resume when the waiting hook lookup errors", async () => {
    mockGetHook.mockRejectedValue(new Error("network blip"));

    const res = await postWebhook(syncWebhookBody("item-3"));
    expect(res.status).toBe(200);

    expect(mockResume).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(plaidSyncWorkflow, [
      {
        historical_update_complete: true,
        initial_update_complete: true,
        item_id: "item-3",
      },
    ]);
  });
});

describe("plaid webhook router — other product webhooks go direct (no hook lookup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-direct" } as unknown as Awaited<
      ReturnType<typeof start>
    >);
  });

  it("routes HOLDINGS.DEFAULT_UPDATE directly to plaidHoldingsWorkflow without hook lookup", async () => {
    const body = {
      environment: "sandbox",
      item_id: "item-h",
      webhook_code: "DEFAULT_UPDATE",
      webhook_type: "HOLDINGS",
    };
    const res = await postWebhook(body);
    expect(res.status).toBe(200);
    expect(mockGetHook).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("routes LIABILITIES.DEFAULT_UPDATE directly without hook lookup", async () => {
    const body = {
      environment: "sandbox",
      item_id: "item-l",
      webhook_code: "DEFAULT_UPDATE",
      webhook_type: "LIABILITIES",
    };
    const res = await postWebhook(body);
    expect(res.status).toBe(200);
    expect(mockGetHook).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("routes INVESTMENTS_TRANSACTIONS.HISTORICAL_UPDATE directly without hook lookup", async () => {
    const body = {
      environment: "sandbox",
      item_id: "item-i",
      webhook_code: "HISTORICAL_UPDATE",
      webhook_type: "INVESTMENTS_TRANSACTIONS",
    };
    const res = await postWebhook(body);
    expect(res.status).toBe(200);
    expect(mockGetHook).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(plaidInvestmentTransactionsWorkflow, expect.anything());
  });

  it("routes HOLDINGS.DEFAULT_UPDATE to holdings workflow specifically", async () => {
    const res = await postWebhook({
      environment: "sandbox",
      item_id: "item-h2",
      webhook_code: "DEFAULT_UPDATE",
      webhook_type: "HOLDINGS",
    });
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(plaidHoldingsWorkflow, expect.anything());
  });

  it("routes LIABILITIES.DEFAULT_UPDATE to liabilities workflow with item_id", async () => {
    const res = await postWebhook({
      environment: "sandbox",
      item_id: "item-l2",
      webhook_code: "DEFAULT_UPDATE",
      webhook_type: "LIABILITIES",
    });
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(plaidLiabilitiesSyncWorkflow, ["item-l2"]);
  });

  it("routes TRANSACTIONS.RECURRING_TRANSACTIONS_UPDATE to recurring workflow", async () => {
    const body = {
      account_ids: [],
      environment: "sandbox",
      item_id: "item-r",
      webhook_code: "RECURRING_TRANSACTIONS_UPDATE",
      webhook_type: "TRANSACTIONS",
    };
    const res = await postWebhook(body);
    expect(res.status).toBe(200);
    expect(mockGetHook).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(plaidRecurringTransactionsWorkflow, [body]);
    expect(mockStart).not.toHaveBeenCalledWith(plaidSyncWorkflow, expect.anything());
  });
});

describe("plaid webhook router — ITEM webhooks always route to item workflow (bypass freeze gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-item" } as unknown as Awaited<
      ReturnType<typeof start>
    >);
  });

  it.each([
    ["ERROR", { error: { error_code: "ITEM_LOGIN_REQUIRED" } }],
    ["ITEM_LOGIN_REPAIRED", {}],
    ["NEW_ACCOUNTS_AVAILABLE", {}],
    ["PENDING_DISCONNECT", {}],
  ])("routes ITEM.%s to item webhook workflow", async (code, extra) => {
    const body = {
      environment: "sandbox",
      item_id: `item-${code}`,
      webhook_code: code,
      webhook_type: "ITEM",
      ...extra,
    };
    const res = await postWebhook(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(plaidItemWebhookWorkflow, [
      expect.objectContaining({ webhook_code: code, webhook_type: "ITEM" }),
    ]);
  });
});

describe("plaid webhook router — unhandled variants ack without throw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-x" } as unknown as Awaited<ReturnType<typeof start>>);
  });

  it("acks unknown webhook_type without dispatching any workflow", async () => {
    const res = await postWebhook({
      environment: "sandbox",
      item_id: "item-x",
      webhook_code: "SOMETHING_NEW",
      webhook_type: "AUTH",
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toStrictEqual({ status: "ignored" });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("acks unknown TRANSACTIONS code without dispatching any workflow", async () => {
    const res = await postWebhook({
      environment: "sandbox",
      item_id: "item-y",
      webhook_code: "FUTURE_CODE",
      webhook_type: "TRANSACTIONS",
    });
    expect(res.status).toBe(200);
    expect(mockStart).not.toHaveBeenCalled();
  });
});
