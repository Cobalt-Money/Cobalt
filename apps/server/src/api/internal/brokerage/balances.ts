import { getBalancesByUserId } from "@cobalt-web/server-data/brokerage/snaptrade/queries";
import {
  balancesResponseSchema,
  errorResponseSchema,
} from "@cobalt-web/server-data/brokerage/snaptrade/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  method: "get",
  path: "/balances",
  responses: {
    200: {
      content: { "application/json": { schema: balancesResponseSchema } },
      description: "Account balances",
    },
    500: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Server error",
    },
  },
  summary: "Get brokerage balances",
  tags: ["Brokerage"],
});

export const balancesRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    try {
      const result = await getBalancesByUserId(c.var.user.id);
      c.header("Cache-Control", "private, max-age=60");
      return c.json(result, 200);
    } catch {
      return c.json({ error: "Failed to fetch brokerage balances" }, 500);
    }
  }
);
