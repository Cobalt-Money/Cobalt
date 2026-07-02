import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAnonymousMock = vi.fn();
const getSessionMock = vi.fn();
const signOutMock = vi.fn();
const deleteUserMock = vi.fn();
const startMock = vi.fn();
const getRunMock = vi.fn();

vi.mock(
  import("@cobalt-web/auth"),
  () =>
    ({
      auth: {
        api: {
          getSession: getSessionMock,
          signInAnonymous: signInAnonymousMock,
          signOut: signOutMock,
        },
      },
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/user/mutations"),
  () =>
    ({
      deleteUser: deleteUserMock,
    }) as never,
);

vi.mock(
  import("workflow/api"),
  () =>
    ({
      getRun: getRunMock,
      start: startMock,
    }) as never,
);

const { demoRouter } = await import("./index.js");

function anonymousResponse(userId: string): Response {
  return Response.json(
    { user: { id: userId } },
    {
      headers: {
        "set-auth-token": "tok_abc",
        "set-cookie": "cobalt.session=abc; Path=/; HttpOnly",
      },
      status: 200,
    },
  );
}

describe("POST /api/demo/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue(null);
    signInAnonymousMock.mockResolvedValue(anonymousResponse("user_demo_1"));
    startMock.mockResolvedValue({ runId: "run_demo_1" });
  });

  it("returns immediately with runId and does NOT await seedDemoUser", async () => {
    const start = performance.now();
    const res = await demoRouter.request("/create", { method: "POST" });
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    const body = (await res.json()) as { runId: string; userId: string; isDemo: boolean };
    expect(body).toStrictEqual({
      isDemo: true,
      runId: "run_demo_1",
      userId: "user_demo_1",
    });

    // Seed must be enqueued as a background workflow, not awaited inline.
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(startMock.mock.calls[0]?.[1]).toStrictEqual([{ userId: "user_demo_1" }]);

    // Handler is background-only work — should finish in well under the ~10s
    // the inline seed used to take. Padded to 1000ms for CI slop.
    expect(elapsed).toBeLessThan(1000);
  });

  it("reuses existing anonymous session (idempotent) without starting a workflow", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user_existing", isAnonymous: true } });

    const res = await demoRouter.request("/create", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; isDemo: boolean };
    expect(body).toStrictEqual({ isDemo: true, userId: "user_existing" });
    expect(startMock).not.toHaveBeenCalled();
    expect(signInAnonymousMock).not.toHaveBeenCalled();
  });

  it("returns 409 when a real (non-demo) session is active", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user_real", isAnonymous: false } });

    const res = await demoRouter.request("/create", { method: "POST" });
    expect(res.status).toBe(409);
    expect(startMock).not.toHaveBeenCalled();
  });

  it("surfaces a 502 when Better Auth's signInAnonymous fails", async () => {
    signInAnonymousMock.mockResolvedValue(new Response("boom", { status: 500 }));

    const res = await demoRouter.request("/create", { method: "POST" });
    expect(res.status).toBe(502);
    expect(startMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/demo/progress/:runId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the run doesn't exist", async () => {
    getRunMock.mockReturnValue({
      exists: Promise.resolve(false),
    });

    const res = await demoRouter.request("/progress/run_missing");
    expect(res.status).toBe(404);
  });

  it("streams progress events as NDJSON", async () => {
    const chunks = [
      { at: 1, phase: "accounts", status: "start", userId: "u" },
      { at: 2, phase: "accounts", status: "done", userId: "u" },
    ];
    const readable = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });
    getRunMock.mockReturnValue({
      exists: Promise.resolve(true),
      getReadable: () => readable,
    });

    const res = await demoRouter.request("/progress/run_ok");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/x-ndjson");
    const text = await res.text();
    const lines = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines).toStrictEqual(chunks);
  });
});
