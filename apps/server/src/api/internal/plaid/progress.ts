import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { getRun } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { requireAuth } from "../middleware.js";

// Plain (non-OpenAPI) route: streams NDJSON, so it can't return a JSON
// response schema. Auth + missing-run still emit the standard
// `{code, error}` shape via ApiError (401 from middleware, 404 here).
export const progressRouter = createApp().get("/progress/:runId", requireAuth, async (c) => {
  const runId = c.req.param("runId");
  const startIndexParam = c.req.query("startIndex");
  // Default 0 so late subscribers (sub-second sandbox runs) replay history.
  const startIndex = startIndexParam ? Number.parseInt(startIndexParam, 10) : 0;

  const run = getRun(runId);
  if (!(await run.exists)) {
    throw new ApiError(404, "plaid_run_not_found", "Workflow run not found");
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
});
