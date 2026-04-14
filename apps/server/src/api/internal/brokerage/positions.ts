import { getPositionsByUserId } from "@cobalt-web/server-data/brokerage/snaptrade/queries";
import {
  errorResponseSchema,
  positionsQuerySchema,
  positionsResponseSchema,
} from "@cobalt-web/server-data/brokerage/snaptrade/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/positions",
  request: { query: positionsQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: positionsResponseSchema } },
      description: "Brokerage positions",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get brokerage positions",
  tags: ["Brokerage"],
});

export const positionsRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const result = await getPositionsByUserId(
        c.var.user.id,
        c.req.valid("query")
      );
      c.header("Cache-Control", "private, max-age=60");
      return c.json(result, 200);
    } catch {
      return c.json({ error: "Failed to fetch brokerage positions" }, 500);
    }
  }
);
