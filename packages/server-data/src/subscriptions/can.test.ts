import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeFindMany = vi.fn<(args: unknown) => Promise<unknown[]>>();
const mobileFindMany = vi.fn<(args: unknown) => Promise<unknown[]>>();

vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        query: {
          mobileSubscription: { findMany: mobileFindMany },
          plaidConnection: { findMany: vi.fn().mockResolvedValue([]) },
          snaptradeAuthorization: { findMany: vi.fn().mockResolvedValue([]) },
          subscription: { findMany: stripeFindMany },
        },
      },
    }) as never,
);

const { can } = await import("./can.js");

describe("can()", () => {
  beforeEach(() => {
    stripeFindMany.mockReset().mockResolvedValue([]);
    mobileFindMany.mockReset().mockResolvedValue([]);
  });

  it("free user denied model:opus", async () => {
    await expect(can("u1", "model:opus")).resolves.toBeFalsy();
  });

  it("paid user granted model:opus", async () => {
    stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
    await expect(can("u1", "model:opus")).resolves.toBeTruthy();
  });

  it("free user denied thinking:extended", async () => {
    await expect(can("u1", "thinking:extended")).resolves.toBeFalsy();
  });

  it("paid user granted thinking:extended", async () => {
    stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
    await expect(can("u1", "thinking:extended")).resolves.toBeTruthy();
  });

  it("free user granted connection:add when under cap", async () => {
    await expect(can("u1", "connection:add", { current: 1 })).resolves.toBeTruthy();
  });

  it("free user denied connection:add when at cap", async () => {
    await expect(can("u1", "connection:add", { current: 2 })).resolves.toBeFalsy();
  });

  it("paid user granted connection:add at any count", async () => {
    stripeFindMany.mockResolvedValueOnce([{ status: "active" }]);
    await expect(can("u1", "connection:add", { current: 999 })).resolves.toBeTruthy();
  });
});
