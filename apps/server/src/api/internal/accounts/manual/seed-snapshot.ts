import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/accounts/_shared";
import { seedManualSnapshot } from "@cobalt-web/server-data/accounts/manual/seed-snapshot";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Force today's balance snapshot upsert for the caller's manual accounts.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/manual/seed-snapshot",
  responses: {
    200: jsonContent(successResponseSchema, "Snapshot seeded"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Seed today's snapshot for manual accounts",
  tags: ["Accounts"],
});

export const manualSeedSnapshotRouter = createApp().openapi(route, async (c) => {
  await seedManualSnapshot(c.var.user.id);
  return c.json(successResponseSchema.parse({ message: "ok", success: true }), 200);
});
