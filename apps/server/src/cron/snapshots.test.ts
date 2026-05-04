import * as envModule from "@cobalt-web/env/server";
import { getUserIdsWithConnectedAccounts } from "@cobalt-web/server-data/user/queries";
import { send } from "@vercel/queue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cronSnapshotsRouter } from "./snapshots.js";

vi.mock(import("@cobalt-web/env/server"), (() => ({
  env: { CRON_SECRET: "test-secret" },
})) as never);

vi.mock(import("@cobalt-web/server-data/user/queries"), () => ({
  getUserIdsWithConnectedAccounts: vi.fn(),
}));

vi.mock(import("@vercel/queue"), () => ({
  send: vi.fn(),
}));

interface MutableEnv {
  CRON_SECRET: string | undefined;
}

const mockListUsers = vi.mocked(getUserIdsWithConnectedAccounts);
const mockSend = vi.mocked(send);

function call(authHeader?: string) {
  return cronSnapshotsRouter.request("/snapshots", {
    headers: authHeader === undefined ? {} : { Authorization: authHeader },
    method: "GET",
  });
}

describe("cronSnapshotsRouter — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET =
      "test-secret";
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET = undefined;
    const res = await call("Bearer test-secret");
    expect(res.status).toBe(503);
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header missing", async () => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token wrong", async () => {
    const res = await call("Bearer nope");
    expect(res.status).toBe(401);
  });
});

describe("cronSnapshotsRouter — fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET =
      "test-secret";
  });

  it("returns enqueued:0 when no users", async () => {
    mockListUsers.mockResolvedValueOnce([]);
    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toStrictEqual({ enqueued: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("publishes one queue message per user with idempotency key", async () => {
    mockListUsers.mockResolvedValueOnce(["u1", "u2", "u3"]);
    mockSend.mockImplementation((_topic, _msg, opts) =>
      Promise.resolve({
        messageId: `mid-${opts?.idempotencyKey ?? "x"}`,
      } as never)
    );

    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);

    expect(mockSend).toHaveBeenCalledTimes(3);
    const today = new Date().toISOString().slice(0, 10);
    for (const uid of ["u1", "u2", "u3"]) {
      expect(mockSend).toHaveBeenCalledWith(
        "snapshots",
        { userId: uid },
        { idempotencyKey: `snapshot-${uid}-${today}` }
      );
    }

    const json = (await res.json()) as { enqueued: number };
    expect(json.enqueued).toBe(3);
  });
});
