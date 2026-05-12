import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getUserLastSeen,
  lastSeenResponseSchema,
  updateLastSeen,
} from "@cobalt-web/server-data/user";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const getRoute = createRoute({
  description:
    "Get the authenticated user's last-seen timestamp and whether financial updates should be shown",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/lastSeen",
  responses: {
    200: jsonContent(lastSeenResponseSchema, "Last seen status"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Get last seen",
  tags: ["User"],
});

const postRoute = createRoute({
  description:
    "Update the authenticated user's last-seen timestamp to now (called when user dismisses financial updates)",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/lastSeen",
  responses: {
    200: jsonContent(lastSeenResponseSchema, "Last seen updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Update last seen",
  tags: ["User"],
});

export const lastSeenRouter = createApp()
  .openapi(getRoute, async (c) => {
    const result = await getUserLastSeen(c.var.user.id);
    return c.json(result, 200);
  })
  .openapi(postRoute, async (c) => {
    const result = await updateLastSeen(c.var.user.id);
    return c.json(result, 200);
  });
