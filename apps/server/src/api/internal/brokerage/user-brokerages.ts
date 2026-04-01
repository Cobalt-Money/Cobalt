import { getUserBrokeragesByUserId } from "@cobalt-web/server-data/brokerage/snaptrade/queries";
import {
  errorResponseSchema,
  userBrokeragesResponseSchema,
} from "@cobalt-web/server-data/brokerage/snaptrade/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/user-brokerages",
  responses: {
    200: {
      content: {
        "application/json": { schema: userBrokeragesResponseSchema },
      },
      description: "List of connected brokerage names",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get user brokerages",
  tags: ["Brokerage"],
});

export const userBrokeragesRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const data = await getUserBrokeragesByUserId(c.var.user.id);
      c.header("Cache-Control", "private, max-age=60");
      return c.json({ data }, 200);
    } catch {
      return c.json({ error: "Failed to fetch user brokerages" }, 500);
    }
  }
);
