import { upsertAllBalanceSnapshots } from "@cobalt-web/server-data/snapshots/mutations";
import { getSnaptradeAuthorizationReconciliationTargets } from "@cobalt-web/server-data/providers/snaptrade/authorizations/queries";
import { handleCallback } from "@vercel/queue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "workflow/api";

import { snaptradeConnectionReconciliationWorkflow } from "../workflows/snaptrade/connection/workflow.js";

vi.mock(import("@cobalt-web/server-data/providers/snaptrade/authorizations/queries"), () => ({
  getSnaptradeAuthorizationReconciliationTargets: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/snapshots/mutations"), () => ({
  upsertAllBalanceSnapshots: vi.fn(),
}));

vi.mock(import("../workflows/snaptrade/connection/workflow.js"), () => ({
  snaptradeConnectionReconciliationWorkflow: vi.fn(),
}));

vi.mock(import("workflow/api"), () => ({
  start: vi.fn(),
}));

// handleCallback wraps the user fn and returns a request handler. We capture
// the inner fn so we can invoke it directly without faking the queue's
// OIDC/auth wrapper.
let capturedHandler: ((message: { userId: string }) => Promise<void>) | undefined;

vi.mock(import("@vercel/queue"), () => ({
  handleCallback: vi.fn((fn) => {
    capturedHandler = fn as never;
    return (() => Promise.resolve(new Response("ok"))) as never;
  }),
}));

const mockUpsertAll = vi.mocked(upsertAllBalanceSnapshots);
const mockListReconciliationTargets = vi.mocked(getSnaptradeAuthorizationReconciliationTargets);
const mockStart = vi.mocked(start);

describe("snapshot-user queue consumer", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    capturedHandler = undefined;
    mockListReconciliationTargets.mockResolvedValue([]);
    // Re-import so handleCallback runs and captures the inner fn.
    vi.resetModules();
    await import("./snapshot-user.js");
  });

  it("registers a handleCallback consumer at module load", () => {
    expect(handleCallback).toHaveBeenCalledTimes(1);
    expect(capturedHandler).toBeTypeOf("function");
  });

  it("invokes upsertAllBalanceSnapshots with userId", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    await capturedHandler({ userId: "user-42" });

    expect(mockUpsertAll).toHaveBeenCalledWith("user-42");
  });

  it("starts connection reconciliation for every SnapTrade authorization", async () => {
    mockListReconciliationTargets.mockResolvedValueOnce([
      { authorizationId: "auth-1", providerUserId: "snap-user-1" },
      { authorizationId: "auth-2", providerUserId: "snap-user-1" },
    ]);

    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    await capturedHandler({ userId: "app-user-1" });

    expect(mockListReconciliationTargets).toHaveBeenCalledWith("app-user-1");
    expect(mockStart).toHaveBeenCalledExactlyOnceWith(snaptradeConnectionReconciliationWorkflow, [
      {
        brokerageAuthorizationIds: ["auth-1", "auth-2"],
        userId: "snap-user-1",
      },
    ]);
  });

  it("propagates errors (queue retry contract)", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    mockUpsertAll.mockRejectedValueOnce(new Error("db down"));
    await expect(capturedHandler({ userId: "u" })).rejects.toThrow("db down");
  });
});
