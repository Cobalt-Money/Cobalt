import * as envModule from "@cobalt-web/env/server";
import { fetchRecentEvents } from "@cobalt-web/server-data/news/events/actions";
import { listProcessedEventIds } from "@cobalt-web/server-data/news/events/queries";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "workflow/api";

import { processFinancialEventWorkflow } from "../workflows/news/financial-events/workflow.js";
import { cronFinancialEventsRouter } from "./financial-events.js";

vi.mock(import("@cobalt-web/env/server"), (() => ({
  env: { CRON_SECRET: "test-secret" },
})) as never);

vi.mock(import("@cobalt-web/server-data/news/events/actions"), () => ({
  fetchRecentEvents: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/news/events/queries"), () => ({
  listProcessedEventIds: vi.fn(),
}));

vi.mock(import("workflow/api"), () => ({
  getHookByToken: vi.fn(),
  resumeHook: vi.fn(),
  start: vi.fn(),
}));

vi.mock(import("../workflows/news/financial-events/workflow.js"), () => ({
  processFinancialEventWorkflow: vi.fn(),
}));

interface MutableEnv {
  CRON_SECRET: string | undefined;
}
const mockFetch = vi.mocked(fetchRecentEvents);
const mockListProcessed = vi.mocked(listProcessedEventIds);
const mockStart = vi.mocked(start);

function call(authHeader?: string) {
  return cronFinancialEventsRouter.request("/financial-events", {
    headers: authHeader === undefined ? {} : { Authorization: authHeader },
    method: "GET",
  });
}

function makeEvent(id: string) {
  return {
    description: "",
    event_date: "2026-01-01",
    event_id: id,
    event_name: id,
    tickers: [],
  } as never;
}

describe("cronFinancialEventsRouter — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET =
      "test-secret";
  });

  it("returns 503 when CRON_SECRET unset", async () => {
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET = undefined;
    const res = await call("Bearer test-secret");
    expect(res.status).toBe(503);
  });

  it("returns 401 when missing or wrong bearer", async () => {
    const noAuth = await call();
    expect(noAuth.status).toBe(401);
    const wrongAuth = await call("Bearer wrong");
    expect(wrongAuth.status).toBe(401);
  });
});

describe("cronFinancialEventsRouter — fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(envModule).env as never as MutableEnv).CRON_SECRET =
      "test-secret";
    mockStart.mockResolvedValue({ runId: "run-fe" } as never);
  });

  it("returns triggered:0 when no unprocessed events", async () => {
    mockFetch.mockResolvedValueOnce([makeEvent("e1"), makeEvent("e2")]);
    mockListProcessed.mockResolvedValueOnce(new Set(["e1", "e2"]));

    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toStrictEqual({ triggered: 0 });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("starts one workflow per unprocessed event and skips processed", async () => {
    mockFetch.mockResolvedValueOnce([
      makeEvent("e1"),
      makeEvent("e2"),
      makeEvent("e3"),
    ]);
    mockListProcessed.mockResolvedValueOnce(new Set(["e2"]));

    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(mockStart).toHaveBeenNthCalledWith(
      1,
      processFinancialEventWorkflow,
      [makeEvent("e1")]
    );
    expect(mockStart).toHaveBeenNthCalledWith(
      2,
      processFinancialEventWorkflow,
      [makeEvent("e3")]
    );
  });

  it("caps fan-out at MAX_EVENTS_PER_RUN (30)", async () => {
    const events = Array.from({ length: 50 }, (_, i) => makeEvent(`e${i}`));
    mockFetch.mockResolvedValueOnce(events);
    mockListProcessed.mockResolvedValueOnce(new Set());

    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);
    expect(mockStart).toHaveBeenCalledTimes(30);
  });
});
