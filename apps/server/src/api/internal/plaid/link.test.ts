import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const canAddMock = vi.fn();
const findExistingMock = vi.fn();
const createLinkTokenMock = vi.fn();
const startMock = vi.fn();
const resumeHookMock = vi.fn();

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

const getRoutingMock = vi.fn().mockResolvedValue(null);

vi.mock(
  import("@cobalt-web/server-data/providers/plaid/link/queries"),
  () =>
    ({
      findExistingHealthyConnection: findExistingMock,
      getInstitutionRoutingNumber: getRoutingMock,
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/providers/plaid/link/actions"),
  () =>
    ({
      createLinkToken: createLinkTokenMock,
      createLinkTokenForUpdate: vi.fn().mockResolvedValue({ link_token: "lt_update" }),
    }) as never,
);

vi.mock(
  import("workflow/api"),
  () =>
    ({
      resumeHook: resumeHookMock,
      start: startMock,
    }) as never,
);

const { linkRouter } = await import("./link.js");

function postCreate(body: unknown) {
  return linkRouter.request("/createLinkToken", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("plaid link route — tier gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      session: { id: "sess1" },
      user: { id: "user1" },
    });
    findExistingMock.mockResolvedValue(null);
    createLinkTokenMock.mockResolvedValue({ link_token: "lt_fresh" });
    startMock.mockResolvedValue({ runId: "run1" });
  });

  it("allows fresh link when free user is under connection cap", async () => {
    canAddMock.mockResolvedValue(true);
    const res = await postCreate({});
    expect(res.status).toBe(200);
    expect(createLinkTokenMock).toHaveBeenCalledWith("user1", { routingNumber: null });
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("blocks fresh link with 402 when free user is at the connection cap", async () => {
    canAddMock.mockResolvedValue(false);
    const res = await postCreate({});
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("connection_limit_reached");
    expect(createLinkTokenMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });

  it("bypasses tier gate for Scenario C (existing healthy connection at same institution)", async () => {
    canAddMock.mockResolvedValue(false);
    findExistingMock.mockResolvedValue({
      institutionLogo: null,
      institutionName: "Chase",
      institutionUrl: null,
      plaidAccessToken: "tok_existing",
      plaidItemId: "item_existing",
    });
    const res = await postCreate({ institutionId: "ins_3" });
    expect(res.status).toBe(200);
    expect(canAddMock).not.toHaveBeenCalled();
    expect(createLinkTokenMock).not.toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await postCreate({});
    expect(res.status).toBe(401);
    expect(canAddMock).not.toHaveBeenCalled();
  });
});
