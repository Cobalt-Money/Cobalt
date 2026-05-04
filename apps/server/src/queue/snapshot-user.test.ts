import {
  upsertBankBalanceSnapshotsForUser,
  upsertPlaidInvestmentSnapshotsForUser,
  upsertSnapTradePortfolioSnapshotsForUser,
} from "@cobalt-web/server-data/snapshots/mutations";
import { handleCallback } from "@vercel/queue";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@cobalt-web/server-data/snapshots/mutations"), () => ({
  upsertBankBalanceSnapshotsForUser: vi.fn(),
  upsertPlaidInvestmentSnapshotsForUser: vi.fn(),
  upsertSnapTradePortfolioSnapshotsForUser: vi.fn(),
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

const mockBank = vi.mocked(upsertBankBalanceSnapshotsForUser);
const mockPlaidInv = vi.mocked(upsertPlaidInvestmentSnapshotsForUser);
const mockSnaptrade = vi.mocked(upsertSnapTradePortfolioSnapshotsForUser);

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

  it("invokes all three snapshot upserts with userId + 'cron' source", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    await capturedHandler({ userId: "user-42" });

    expect(mockBank).toHaveBeenCalledWith("user-42", "cron");
    expect(mockSnaptrade).toHaveBeenCalledWith("user-42", "cron");
    expect(mockPlaidInv).toHaveBeenCalledWith("user-42", "cron");
  });

  it("propagates errors from any single upsert (queue retry contract)", async () => {
    if (!capturedHandler) {
      throw new Error("handler not captured");
    }
    mockBank.mockRejectedValueOnce(new Error("db down"));
    await expect(capturedHandler({ userId: "u" })).rejects.toThrow("db down");
  });
});
