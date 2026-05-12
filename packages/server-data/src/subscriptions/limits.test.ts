import { beforeEach, describe, expect, it, vi } from "vitest";

const plaidFindMany = vi.fn<(args: unknown) => Promise<{ id: string }[]>>();
const snapFindMany = vi.fn<(args: unknown) => Promise<{ id: string }[]>>();
const stripeFindMany = vi.fn<(args: unknown) => Promise<unknown[]>>();
const mobileFindMany = vi.fn<(args: unknown) => Promise<unknown[]>>();

vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        query: {
          mobileSubscription: { findMany: mobileFindMany },
          plaidConnection: { findMany: plaidFindMany },
          snaptradeAuthorization: { findMany: snapFindMany },
          subscription: { findMany: stripeFindMany },
        },
      },
    }) as never,
);

const { FREE_LIMITS, getUserLimits, PRO_LIMITS, userCanAddConnection, userConnectionCount } =
  await import("./limits.js");

describe("subscription tier limits", () => {
  beforeEach(() => {
    plaidFindMany.mockReset().mockResolvedValue([]);
    snapFindMany.mockReset().mockResolvedValue([]);
    stripeFindMany.mockReset().mockResolvedValue([]);
    mobileFindMany.mockReset().mockResolvedValue([]);
  });

  describe("getUserLimits", () => {
    it("returns FREE_LIMITS for user with no subscription", async () => {
      await expect(getUserLimits("u1")).resolves.toBe(FREE_LIMITS);
    });

    it("returns PRO_LIMITS for user with active Stripe subscription", async () => {
      stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
      await expect(getUserLimits("u1")).resolves.toBe(PRO_LIMITS);
    });

    it("returns PRO_LIMITS for user with active App Store subscription", async () => {
      mobileFindMany.mockResolvedValueOnce([
        { expiresAt: new Date(Date.now() + 86_400_000), status: "active" },
      ]);
      await expect(getUserLimits("u1")).resolves.toBe(PRO_LIMITS);
    });
  });

  describe("userConnectionCount", () => {
    it("sums Plaid + SnapTrade rows", async () => {
      plaidFindMany.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);
      snapFindMany.mockResolvedValueOnce([{ id: "s1" }]);
      await expect(userConnectionCount("u1")).resolves.toBe(3);
    });

    it("returns 0 when no connections exist", async () => {
      await expect(userConnectionCount("u1")).resolves.toBe(0);
    });

    it("queries with pendingDisconnectAt isNull filter for Plaid", async () => {
      await userConnectionCount("u1");
      const call = plaidFindMany.mock.calls.at(0)?.[0] as {
        where: { pendingDisconnectAt: { isNull: boolean } };
      };
      expect(call.where.pendingDisconnectAt).toStrictEqual({ isNull: true });
    });

    it("queries with is_disabled false filter for SnapTrade", async () => {
      await userConnectionCount("u1");
      const call = snapFindMany.mock.calls.at(0)?.[0] as {
        where: { isDisabled: { eq: boolean } };
      };
      expect(call.where.isDisabled).toStrictEqual({ eq: false });
    });
  });

  describe("tier model + capability shape", () => {
    it("FREE_LIMITS exposes only Haiku and blocks every paid capability", () => {
      expect(FREE_LIMITS.models).toStrictEqual(["anthropic/claude-haiku-4.5"]);
      expect(FREE_LIMITS.extendedThinking).toBeFalsy();
      expect(FREE_LIMITS.analystMode).toBeFalsy();
      expect(FREE_LIMITS.mcpEnabled).toBeTruthy();
      expect(FREE_LIMITS.csvExport).toBeFalsy();
      expect(FREE_LIMITS.connections).toBe(1);
      expect(FREE_LIMITS.documents).toBe(5);
    });

    it("PRO_LIMITS exposes Haiku + Sonnet + Opus and unlocks every capability", () => {
      expect(PRO_LIMITS.models).toStrictEqual([
        "anthropic/claude-haiku-4.5",
        "anthropic/claude-sonnet-4.6",
        "anthropic/claude-opus-4.7",
      ]);
      expect(PRO_LIMITS.extendedThinking).toBeTruthy();
      expect(PRO_LIMITS.analystMode).toBeTruthy();
      expect(PRO_LIMITS.mcpEnabled).toBeTruthy();
      expect(PRO_LIMITS.csvExport).toBeTruthy();
      expect(PRO_LIMITS.connections).toBe(Number.POSITIVE_INFINITY);
      expect(PRO_LIMITS.documents).toBe(Number.POSITIVE_INFINITY);
    });

    it("free user is gated to Haiku at runtime", async () => {
      const limits = await getUserLimits("u1");
      expect(limits.models).toContain("anthropic/claude-haiku-4.5");
      expect(limits.models).not.toContain("anthropic/claude-sonnet-4.6");
      expect(limits.models).not.toContain("anthropic/claude-opus-4.7");
      expect(limits.extendedThinking).toBeFalsy();
    });

    it("paid user can use every model + extended thinking at runtime", async () => {
      stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
      const limits = await getUserLimits("u1");
      expect(limits.models).toContain("anthropic/claude-sonnet-4.6");
      expect(limits.models).toContain("anthropic/claude-opus-4.7");
      expect(limits.extendedThinking).toBeTruthy();
    });
  });

  describe("userCanAddConnection", () => {
    it("allows free user with 0 connections", async () => {
      await expect(userCanAddConnection("u1")).resolves.toBeTruthy();
    });

    it("blocks free user with 1 connection", async () => {
      plaidFindMany.mockResolvedValueOnce([{ id: "p1" }]);
      await expect(userCanAddConnection("u1")).resolves.toBeFalsy();
    });

    it("blocks free user when SnapTrade alone fills the pool", async () => {
      snapFindMany.mockResolvedValueOnce([{ id: "s1" }]);
      await expect(userCanAddConnection("u1")).resolves.toBeFalsy();
    });

    it("allows paid user regardless of connection count", async () => {
      stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
      plaidFindMany.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
      snapFindMany.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);
      await expect(userCanAddConnection("u1")).resolves.toBeTruthy();
    });
  });
});
