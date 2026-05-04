import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyAppStoreNotificationStep } from "./steps";
import { appstoreWebhookWorkflow } from "./workflow";

vi.mock(import("./steps"), () => ({
  applyAppStoreNotificationStep: vi.fn(),
}));

vi.mock(import("../shared/steps"), () => ({
  captureWorkflowExceptionStep: vi.fn(),
  toSerializableError: vi.fn((e) => ({
    message: e instanceof Error ? e.message : "x",
  })),
}));

const baseParams = {
  environment: "Production",
  expiresAt: 1_700_000_000_000,
  latestTransactionId: "txn-1",
  notificationType: "DID_RENEW",
  originalTransactionId: "orig-1",
  productId: "com.cobalt.pro.monthly",
} as never;

describe("appstoreWebhookWorkflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on apply step success", async () => {
    vi.mocked(applyAppStoreNotificationStep).mockResolvedValueOnce({
      ok: true,
    } as never);
    const out = await appstoreWebhookWorkflow(baseParams);
    expect(out.success).toBeTruthy();
    expect(out.notificationType).toBe("DID_RENEW");
    expect(out.originalTransactionId).toBe("orig-1");
    expect(out.result).toStrictEqual({ ok: true });
  });

  it("returns success:false and surfaces error message on failure", async () => {
    vi.mocked(applyAppStoreNotificationStep).mockRejectedValueOnce(
      new Error("subscription not found"),
    );
    const out = await appstoreWebhookWorkflow(baseParams);
    expect(out.success).toBeFalsy();
    expect(out.error).toBe("subscription not found");
    expect(out.notificationType).toBe("DID_RENEW");
    expect(out.originalTransactionId).toBe("orig-1");
  });
});
