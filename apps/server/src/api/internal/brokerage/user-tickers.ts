import { getUserTickersByUserId } from "@cobalt-web/server-data/brokerage/queries";
import {
  errorResponseSchema,
  userTickersResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/user-tickers",
  responses: {
    200: {
      content: { "application/json": { schema: userTickersResponseSchema } },
      description: "List of held stock tickers",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get user tickers",
  tags: ["Brokerage"],
});

export const userTickersRouter = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  try {
    const tickers = await getUserTickersByUserId(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ tickers }, 200);
  } catch {
    return c.json({ error: "Failed to fetch user tickers" }, 500);
  }
});
