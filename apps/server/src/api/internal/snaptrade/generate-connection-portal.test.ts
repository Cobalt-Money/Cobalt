import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const canAddMock = vi.fn();
const generatePortalMock = vi.fn();

vi.mock(
  import("@cobalt-web/auth"),
  () =>
    ({
      auth: { api: { getSession: getSessionMock } },
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/subscriptions"),
  () =>
    ({
      userCanAddConnection: canAddMock,
      userHasActiveSubscription: vi.fn().mockResolvedValue(false),
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/providers/snaptrade/auth/actions"),
  () =>
    ({
      generateConnectionPortal: generatePortalMock,
    }) as never,
);

const { generateConnectionPortalRouter } = await import("./generate-connection-portal.js");

function postPortal(body: unknown) {
  return generateConnectionPortalRouter.request("/generateConnectionPortal", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("snaptrade portal route — tier gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      session: { id: "sess1" },
      user: { id: "user1" },
    });
    generatePortalMock.mockResolvedValue({ redirectURI: "https://snaptrade.example/portal" });
  });

  it("allows new connection when free user is under cap", async () => {
    canAddMock.mockResolvedValue(true);
    const res = await postPortal({ broker: "ROBINHOOD" });
    expect(res.status).toBe(200);
    expect(generatePortalMock).toHaveBeenCalledWith("user1", "ROBINHOOD", undefined);
  });

  it("blocks new connection with 402 when free user is at cap", async () => {
    canAddMock.mockResolvedValue(false);
    const res = await postPortal({ broker: "ROBINHOOD" });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("connection_limit_reached");
    expect(generatePortalMock).not.toHaveBeenCalled();
  });

  it("bypasses tier gate for reconnect flow (reconnectAuthorizationId provided)", async () => {
    canAddMock.mockResolvedValue(false);
    const res = await postPortal({ broker: "ROBINHOOD", reconnectAuthorizationId: "auth_xyz" });
    expect(res.status).toBe(200);
    expect(canAddMock).not.toHaveBeenCalled();
    expect(generatePortalMock).toHaveBeenCalledWith("user1", "ROBINHOOD", "auth_xyz");
  });

  it("returns 401 when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await postPortal({ broker: "ROBINHOOD" });
    expect(res.status).toBe(401);
    expect(canAddMock).not.toHaveBeenCalled();
  });
});
