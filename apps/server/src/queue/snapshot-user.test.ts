import { upsertAllBalanceSnapshots } from "@cobalt-web/server-data/snapshots/mutations";
import { handleCallback } from "@vercel/queue";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@cobalt-web/server-data/snapshots/mutations"), () => ({
  upsertAllBalanceSnapshots: vi.fn(),
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

describe("snapshot-user queue consumer", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    capturedHandler = undefined;
    // Re-import so handleCallback runs and captures the inner fn.
    vi.resetModules();
    await import("./snapshot-user.js");
  });

  it("registers a handleCallback consumer at module load", () => {
    expect(handleCallback).toHaveBeenCalledTimes(1);
    expect(capturedHandler).toBeTypeOf("function");
  });

  it("invokes upsertAllBalanceSnapshots with userId + 'cron' source", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    await capturedHandler({ userId: "user-42" });

    expect(mockUpsertAll).toHaveBeenCalledWith("user-42", "cron");
  });

  it("propagates errors (queue retry contract)", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    mockUpsertAll.mockRejectedValueOnce(new Error("db down"));
    await expect(capturedHandler({ userId: "u" })).rejects.toThrow("db down");
  });
});
