import { toBrokerageAccountListItem } from "@cobalt-web/server-data/brokerage/snaptrade/lib";
import { getSnaptradeBrokerageAccountsByUserId } from "@cobalt-web/server-data/brokerage/snaptrade/queries";
import {
  brokerageAccountIdParamSchema,
  disconnectBrokerageAccountResponseSchema,
  errorResponseSchema,
  snaptradeBrokerageAccountsListResponseSchema,
} from "@cobalt-web/server-data/brokerage/snaptrade/schemas";
import { disconnectBrokerageAccountByUserId } from "@cobalt-web/server-data/snaptrade/disconnect";
import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const listRoute = createRoute({
  description:
    "SnapTrade-connected brokerage accounts only (Plaid investment accounts are listed via merged brokerage or bank account APIs).",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/brokerage",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: snaptradeBrokerageAccountsListResponseSchema,
        },
      },
      description: "Brokerage accounts",
    },
    500: {
      content: {
        "application/json": { schema: errorResponseSchema },
      },
      description: "Server error",
    },
  },
  summary: "List SnapTrade brokerage accounts",
  tags: ["Accounts"],
});

const deleteRoute = createRoute({
  description:
    "Disconnect a SnapTrade brokerage account (removes authorization, accounts, and related snapshots).",
  method: "delete",
  path: "/brokerage/{accountId}",
  request: { params: brokerageAccountIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: disconnectBrokerageAccountResponseSchema,
        },
      },
      description: "Disconnect result",
    },
    403: {
      content: {
        "application/json": { schema: errorResponseSchema },
      },
      description: "Subscription required",
    },
    500: {
      content: {
        "application/json": { schema: errorResponseSchema },
      },
      description: "Server error",
    },
  },
  summary: "Disconnect SnapTrade brokerage account",
  tags: ["Accounts"],
});

export const brokerageSnaptradeRouter = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    try {
      const accounts = await getSnaptradeBrokerageAccountsByUserId(
        c.var.user.id
      );
      const items = accounts.map(toBrokerageAccountListItem);
      c.header("Cache-Control", "private, max-age=60");
      return c.json({ accounts: items }, 200);
    } catch {
      return c.json({ error: "Failed to fetch brokerage accounts" }, 500);
    }
  })
  .openapi(deleteRoute, async (c) => {
    const entitled = await userHasActiveSubscription(c.var.user.id);
    if (!entitled) {
      return c.json({ error: "Subscription required" }, 403);
    }

    const { accountId } = c.req.valid("param");

    try {
      const result = await disconnectBrokerageAccountByUserId(
        c.var.user.id,
        accountId
      );
      return c.json(result, 200);
    } catch {
      return c.json(
        { error: "Failed to disconnect account. Please try again." },
        500
      );
    }
  });
