import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "workflow/api";

import {
  snaptradeConnectionAddedWorkflow,
  snaptradeConnectionBrokenWorkflow,
  snaptradeConnectionDeletedWorkflow,
  snaptradeConnectionFixedWorkflow,
  snaptradeConnectionUpdatedWorkflow,
  snaptradeHoldingsUpdatedWorkflow,
} from "../workflows/snaptrade/connection/workflow.js";
import {
  snaptradeTransactionsInitialWorkflow,
  snaptradeTransactionsUpdatedWorkflow,
} from "../workflows/snaptrade/transactions/workflow.js";
import { snaptradeWebhookRouter } from "./snaptrade.js";

vi.mock(import("@cobalt-web/env/server"), (() => ({
  env: { SNAPTRADE_CONSUMER_KEY: "test-consumer-key" },
})) as never);

const CONSUMER_KEY = "test-consumer-key";

vi.mock(import("workflow/api"), () => ({
  getHookByToken: vi.fn(),
  resumeHook: vi.fn(),
  start: vi.fn(),
}));

vi.mock(import("../workflows/snaptrade/connection/workflow.js"), () => ({
  snaptradeConnectionAddedWorkflow: vi.fn(),
  snaptradeConnectionBrokenWorkflow: vi.fn(),
  snaptradeConnectionDeletedWorkflow: vi.fn(),
  snaptradeConnectionFixedWorkflow: vi.fn(),
  snaptradeConnectionUpdatedWorkflow: vi.fn(),
  snaptradeHoldingsUpdatedWorkflow: vi.fn(),
}));

vi.mock(import("../workflows/snaptrade/transactions/workflow.js"), () => ({
  snaptradeTransactionsInitialWorkflow: vi.fn(),
  snaptradeTransactionsUpdatedWorkflow: vi.fn(),
}));

const mockStart = vi.mocked(start);

function sign(body: unknown): string {
  // Mirror prod normalization: sort keys recursively, then HMAC-SHA256.
  const normalized = JSON.stringify(sortKeys(body));
  return createHmac("sha256", CONSUMER_KEY).update(normalized).digest("base64");
}

function sortKeys(v: unknown): unknown {
  if (v === null || typeof v !== "object") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(sortKeys);
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).toSorted()) {
    const val = (v as Record<string, unknown>)[k];
    if (val !== undefined) {
      out[k] = sortKeys(val);
    }
  }
  return out;
}

function postWebhook(body: unknown, signature?: string) {
  const raw = JSON.stringify(body);
  return snaptradeWebhookRouter.request("/", {
    body: raw,
    headers: {
      "Content-Type": "application/json",
      ...(signature === undefined ? {} : { Signature: signature }),
    },
    method: "POST",
  });
}

// Injects a fresh eventTimestamp and signs the resulting body. Use for the
// happy-path dispatch tests that don't care about the timestamp value.
function postSigned(
  body: Record<string, unknown>,
  eventTimestampOverride?: string
) {
  const withTs = {
    ...body,
    eventTimestamp: eventTimestampOverride ?? new Date().toISOString(),
  };
  return postWebhook(withTs, sign(withTs));
}

describe("snaptrade webhook router — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run" } as never);
  });

  it("returns 401 when Signature header is missing", async () => {
    const res = await postWebhook({
      eventType: "CONNECTION_ADDED",
      userId: "u1",
    });
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 401 when signature is invalid", async () => {
    const res = await postWebhook(
      { eventType: "CONNECTION_ADDED", userId: "u1" },
      "deadbeef"
    );
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 400 when payload is missing required fields", async () => {
    const body = { eventType: "CONNECTION_ADDED" };
    const res = await postSigned(body);
    expect(res.status).toBe(400);
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe("snaptrade webhook router — event dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run" } as never);
  });

  it("dispatches CONNECTION_ADDED with brokerage ids", async () => {
    const body = {
      brokerageAuthorizationId: "auth-1",
      brokerageId: "broker-1",
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeConnectionAddedWorkflow, [
      {
        brokerageAuthorizationId: "auth-1",
        brokerageId: "broker-1",
        userId: "user-1",
      },
    ]);
  });

  it("dispatches CONNECTION_UPDATED", async () => {
    const body = {
      brokerageAuthorizationId: "auth-2",
      eventType: "CONNECTION_UPDATED",
      userId: "user-2",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeConnectionUpdatedWorkflow, [
      { brokerageAuthorizationId: "auth-2", userId: "user-2" },
    ]);
  });

  it("dispatches CONNECTION_BROKEN", async () => {
    const body = {
      brokerageAuthorizationId: "auth-3",
      eventType: "CONNECTION_BROKEN",
      userId: "user-3",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeConnectionBrokenWorkflow, [
      { brokerageAuthorizationId: "auth-3", userId: "user-3" },
    ]);
  });

  it("dispatches CONNECTION_FIXED", async () => {
    const body = {
      brokerageAuthorizationId: "auth-4",
      eventType: "CONNECTION_FIXED",
      userId: "user-4",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeConnectionFixedWorkflow, [
      { brokerageAuthorizationId: "auth-4", userId: "user-4" },
    ]);
  });

  it("dispatches CONNECTION_DELETED", async () => {
    const body = {
      brokerageAuthorizationId: "auth-5",
      eventType: "CONNECTION_DELETED",
      userId: "user-5",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeConnectionDeletedWorkflow, [
      { brokerageAuthorizationId: "auth-5", userId: "user-5" },
    ]);
  });

  it("dispatches ACCOUNT_HOLDINGS_UPDATED with details payload", async () => {
    const details = { balances: { success: true } };
    const body = {
      accountId: "acct-1",
      brokerageAuthorizationId: "auth-6",
      details,
      eventType: "ACCOUNT_HOLDINGS_UPDATED",
      userId: "user-6",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(snaptradeHoldingsUpdatedWorkflow, [
      {
        accountId: "acct-1",
        brokerageAuthorizationId: "auth-6",
        details,
        userId: "user-6",
      },
    ]);
  });

  it("dispatches ACCOUNT_TRANSACTIONS_INITIAL_UPDATE", async () => {
    const body = {
      accountId: "acct-2",
      brokerageAuthorizationId: "auth-7",
      eventType: "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE",
      userId: "user-7",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(
      snaptradeTransactionsInitialWorkflow,
      [
        {
          accountId: "acct-2",
          brokerageAuthorizationId: "auth-7",
          userId: "user-7",
        },
      ]
    );
  });

  it("dispatches ACCOUNT_TRANSACTIONS_UPDATED", async () => {
    const body = {
      accountId: "acct-3",
      brokerageAuthorizationId: "auth-8",
      eventType: "ACCOUNT_TRANSACTIONS_UPDATED",
      userId: "user-8",
    };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(
      snaptradeTransactionsUpdatedWorkflow,
      [
        {
          accountId: "acct-3",
          brokerageAuthorizationId: "auth-8",
          userId: "user-8",
        },
      ]
    );
  });

  it("ignores unknown event types without erroring", async () => {
    const body = { eventType: "SOMETHING_NEW", userId: "user-9" };
    const res = await postSigned(body);
    expect(res.status).toBe(200);
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe("snaptrade webhook router — replay protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run" } as never);
  });

  it("returns 401 when eventTimestamp is missing", async () => {
    const body = { eventType: "CONNECTION_ADDED", userId: "user-1" };
    const res = await postWebhook(body, sign(body));
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 401 when eventTimestamp is older than 5 minutes", async () => {
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const body = {
      eventTimestamp: stale,
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const res = await postWebhook(body, sign(body));
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 401 when eventTimestamp is far in the future", async () => {
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const body = {
      eventTimestamp: future,
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const res = await postWebhook(body, sign(body));
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 401 when eventTimestamp is unparseable", async () => {
    const body = {
      eventTimestamp: "not-a-date",
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const res = await postWebhook(body, sign(body));
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("accepts eventTimestamp within tolerance window", async () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    const res = await postSigned(
      {
        brokerageAuthorizationId: "auth-1",
        brokerageId: "broker-1",
        eventType: "CONNECTION_ADDED",
        userId: "user-1",
      },
      recent
    );
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledOnce();
  });
});

describe("snaptrade webhook router — signature compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run" } as never);
  });

  it("rejects when computed signature differs by length (timing-safe path)", async () => {
    const body = {
      eventTimestamp: new Date().toISOString(),
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const res = await postWebhook(body, "short");
    expect(res.status).toBe(401);
  });

  it("rejects when computed signature differs by content but matches length", async () => {
    const body = {
      eventTimestamp: new Date().toISOString(),
      eventType: "CONNECTION_ADDED",
      userId: "user-1",
    };
    const real = sign(body);
    // Flip last char to corrupt while preserving length.
    const tampered = real.slice(0, -1) + (real.endsWith("A") ? "B" : "A");
    const res = await postWebhook(body, tampered);
    expect(res.status).toBe(401);
  });
});
