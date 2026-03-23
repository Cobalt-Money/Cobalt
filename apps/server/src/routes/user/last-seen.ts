import type { AppEnv } from "@cobalt-web/server-data/types";
import {
  getUserLastSeen,
  lastSeenResponseSchema,
  updateLastSeen,
} from "@cobalt-web/server-data/user";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const getRoute = createRoute({
  description:
    "Get the authenticated user's last-seen timestamp and whether financial updates should be shown",
  method: "get",
  path: "/last-seen",
  responses: {
    200: {
      content: {
        "application/json": { schema: lastSeenResponseSchema },
      },
      description: "Last seen status",
    },
  },
  summary: "Get last seen",
  tags: ["User"],
});

const postRoute = createRoute({
  description:
    "Update the authenticated user's last-seen timestamp to now (called when user dismisses financial updates)",
  method: "post",
  path: "/last-seen",
  responses: {
    200: {
      content: {
        "application/json": { schema: lastSeenResponseSchema },
      },
      description: "Last seen updated",
    },
  },
  summary: "Update last seen",
  tags: ["User"],
});

export const lastSeenRouter = new OpenAPIHono<AppEnv>()
  .openapi(getRoute, async (c) => {
    const result = await getUserLastSeen(c.var.user.id);
    return c.json(result, 200);
  })
  .openapi(postRoute, async (c) => {
    const result = await updateLastSeen(c.var.user.id);
    return c.json(result, 200);
  });
