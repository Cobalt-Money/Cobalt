import * as envModule from "@cobalt-web/env/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "workflow/api";

import { cronRssRouter } from "./rss.js";

vi.mock(import("workflow/api"));
vi.mock(import("@cobalt-web/env/server"), (() => ({
  env: {
    CRON_SECRET: "test-secret",
  },
})) as never);

interface MutableEnv {
  CRON_SECRET: string | undefined;
}
type HandlerCtx = Parameters<(typeof cronRssRouter.routes)[0]["handler"]>[0];

function makeContext(headerValue?: string): {
  context: HandlerCtx;
  jsonMock: ReturnType<typeof vi.fn>;
} {
  const jsonMock = vi.fn().mockReturnValue({});
  const context = {
    json: jsonMock,
    req: {
      header: vi.fn((name: string) => (name === "Authorization" ? headerValue : undefined)),
    },
  } as never as HandlerCtx;
  return { context, jsonMock };
}

describe("cronRssRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const env = vi.mocked(envModule).env as never as MutableEnv;
    env.CRON_SECRET = "test-secret";
  });

  describe("happy path", () => {
    it("starts workflow and returns runId with valid auth", async () => {
      const mockRunId = "run-123";
      vi.mocked(start).mockResolvedValue({ runId: mockRunId } as never);

      const { context, jsonMock } = makeContext("Bearer test-secret");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(start).toHaveBeenCalledWith(expect.any(Function), []);
      expect(jsonMock).toHaveBeenCalledWith({
        runId: mockRunId,
        started: true,
      });
    });
  });

  describe("sad paths", () => {
    it("returns 503 when CRON_SECRET is not configured", async () => {
      const env = vi.mocked(envModule).env as never as MutableEnv;
      env.CRON_SECRET = undefined;

      const { context, jsonMock } = makeContext("Bearer test-secret");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(jsonMock).toHaveBeenCalledWith({ error: "CRON_SECRET not configured" }, 503);
      expect(start).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header is missing", async () => {
      const { context, jsonMock } = makeContext();
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" }, 401);
      expect(start).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header has wrong secret", async () => {
      const { context, jsonMock } = makeContext("Bearer wrong-secret");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" }, 401);
      expect(start).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header format is invalid", async () => {
      const { context, jsonMock } = makeContext("InvalidFormat test-secret");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" }, 401);
      expect(start).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header has Bearer but no secret", async () => {
      const { context, jsonMock } = makeContext("Bearer ");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }
      await route.handler(context, vi.fn() as never);

      expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" }, 401);
      expect(start).not.toHaveBeenCalled();
    });

    it("propagates workflow errors to caller", async () => {
      const error = new Error("Workflow failed");
      vi.mocked(start).mockRejectedValue(error);

      const { context } = makeContext("Bearer test-secret");
      const [route] = cronRssRouter.routes;
      if (!route) {
        throw new Error("no route");
      }

      await expect(route.handler(context, vi.fn() as never)).rejects.toThrow("Workflow failed");
    });
  });
});
