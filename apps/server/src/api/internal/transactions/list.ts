import { getUserTransactions } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionListQuerySchema,
  transactionListResponseSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Paginated, filterable list of user transactions",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    query: transactionListQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: transactionListResponseSchema,
        },
      },
      description: "List of transactions",
    },
  },
  summary: "List transactions",
  tags: ["Transactions"],
});

export const listRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const transactions = await getUserTransactions(
      c.var.user.id,
      c.req.valid("query")
    );
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ transactions }, 200);
  }
);
