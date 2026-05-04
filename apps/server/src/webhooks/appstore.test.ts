import {
  AppStoreVerificationError,
  verifyAppStoreNotification,
} from "@cobalt-web/server-data/subscriptions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "workflow/api";

import { appstoreWebhookWorkflow } from "../workflows/appstore/workflow.js";
import { appstoreWebhookRouter } from "./appstore.js";

vi.mock(import("workflow/api"), () => ({
  getHookByToken: vi.fn(),
  resumeHook: vi.fn(),
  start: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/subscriptions"), () => ({
  AppStoreVerificationError: class extends Error {},
  verifyAppStoreNotification: vi.fn(),
}));

vi.mock(import("../workflows/appstore/workflow.js"), () => ({
  appstoreWebhookWorkflow: vi.fn(),
}));

const mockStart = vi.mocked(start);
const mockVerify = vi.mocked(verifyAppStoreNotification);

function postWebhook(body: unknown) {
  return appstoreWebhookRouter.request("/", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("appstore webhook router — payload guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-app" } as never);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const res = await postWebhook("not-json");
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when signedPayload is missing", async () => {
    const res = await postWebhook({});
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when signedPayload is empty string", async () => {
    const res = await postWebhook({ signedPayload: "" });
    expect(res.status).toBe(400);
  });

  it("returns 401 on signature verification failure", async () => {
    mockVerify.mockRejectedValueOnce(
      new AppStoreVerificationError("bad sig") as Error
    );
    const res = await postWebhook({ signedPayload: "abc" });
    expect(res.status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe("appstore webhook router — verified payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "run-app" } as never);
  });

  it("acks TEST notifications without starting workflow", async () => {
    mockVerify.mockResolvedValueOnce({
      notificationType: "TEST",
      subtype: undefined,
      transaction: null,
    } as never);
    const res = await postWebhook({ signedPayload: "test-payload" });
    expect(res.status).toBe(200);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns 200 with no_transaction_info when transaction missing", async () => {
    mockVerify.mockResolvedValueOnce({
      notificationType: "DID_RENEW",
      subtype: undefined,
      transaction: null,
    } as never);
    const res = await postWebhook({ signedPayload: "x" });
    expect(res.status).toBe(200);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("starts appstore workflow with transaction fields", async () => {
    mockVerify.mockResolvedValueOnce({
      notificationType: "DID_RENEW",
      subtype: "AUTO_RENEW",
      transaction: {
        environment: "Production",
        expiresAt: 1_700_000_000_000,
        originalTransactionId: "orig-1",
        productId: "com.cobalt.pro.monthly",
        transactionId: "txn-1",
      },
    } as never);
    const res = await postWebhook({ signedPayload: "x" });
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledWith(appstoreWebhookWorkflow, [
      {
        environment: "Production",
        expiresAt: 1_700_000_000_000,
        latestTransactionId: "txn-1",
        notificationType: "DID_RENEW",
        originalTransactionId: "orig-1",
        productId: "com.cobalt.pro.monthly",
      },
    ]);
  });
});
