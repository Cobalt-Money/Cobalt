import { getActivitiesByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  activitiesQuerySchema,
  activitiesResponseSchema,
  errorResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/activities",
  request: { query: activitiesQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: activitiesResponseSchema } },
      description: "Brokerage activities",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get brokerage activities",
  tags: ["Brokerage"],
});

export const activitiesRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const result = await getActivitiesByUserId(
        c.var.user.id,
        c.req.valid("query")
      );
      c.header("Cache-Control", "private, max-age=60");
      return c.json(result, 200);
    } catch {
      return c.json({ error: "Failed to fetch brokerage activities" }, 500);
    }
  }
);
