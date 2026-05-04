import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { getRun } from "workflow/api";

import { requireAuth } from "../middleware.js";

export const progressRouter = new OpenAPIHono<AppEnv>().get(
  "/progress/:runId",
  requireAuth,
  async (c) => {
    const runId = c.req.param("runId");
    const startIndexParam = c.req.query("startIndex");
    // Default 0 so late subscribers (sub-second sandbox runs) replay history.
    const startIndex = startIndexParam ? Number.parseInt(startIndexParam, 10) : 0;

    const run = getRun(runId);
    if (!(await run.exists)) {
      return c.json({ error: "run not found" }, 404);
    }
    const readable = run.getReadable({ namespace: "progress", startIndex });

    const encoder = new TextEncoder();
    const ndjson = readable.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        },
      }),
    );

    return new Response(ndjson, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-ndjson",
      },
    });
  },
);
