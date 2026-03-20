import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { getUserTransactions } from "../../db/transactions.js";
import type { AppEnv } from "../../lib/types.js";
import { transactionListItemSchema } from "./schemas.js";

const route = createRoute({
  description: "Paginated, filterable list of user transactions",
  method: "get",
  path: "/",
  request: {
    query: z.object({
      accountType: z.string().optional(),
      endDate: z.string().optional(),
      maxAmount: z.coerce.number().optional(),
      minAmount: z.coerce.number().optional(),
      page: z.coerce.number().default(0),
      pageSize: z.coerce.number().default(50),
      pendingFilter: z.enum(["true", "false"]).optional(),
      primaryCategory: z.string().optional(),
      searchQuery: z.string().optional(),
      startDate: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            transactions: z.array(transactionListItemSchema),
          }),
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
    return c.json({ transactions }, 200);
  }
);
