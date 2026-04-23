import { OpenAPIHono } from "@hono/zod-openapi";

import { balanceSnapshotsRouter } from "./balance-snapshots.js";
import { linkRouter } from "./link.js";
import { progressRouter } from "./progress.js";
import { updateRouter } from "./update.js";

// NOTE: `requireAuth` is applied per-route via `createRoute({ middleware: ... })`
// on each child router, not via `.use("/*", requireAuth)` on this parent.
// `.use()` returns plain `Hono`, which drops OpenAPIHono's `.openapi()` method
// and breaks the chained-type contract described in `apps/server/src/index.ts`.
export const plaidRouter = new OpenAPIHono()
  .route("/", linkRouter)
  .route("/", updateRouter)
  .route("/", balanceSnapshotsRouter)
  .route("/", progressRouter);
