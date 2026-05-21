import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/accounts/schemas";
import { upsertManualBalanceSnapshotsForUser } from "@cobalt-web/server-data/snapshots/mutations";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const seedSnapshot = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/manual/seed-snapshot",
  responses: {
    200: jsonContent(successResponseSchema, "Snapshot seeded"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Seed today's snapshot for the caller's manual accounts",
  tags: ["Accounts"],
});

const manualAccountsRouter = createApp().openapi(seedSnapshot, async (c) => {
  await upsertManualBalanceSnapshotsForUser(c.var.user.id, "manual-create");
  return c.json({ message: "ok", success: true }, 200);
});

export { manualAccountsRouter };
