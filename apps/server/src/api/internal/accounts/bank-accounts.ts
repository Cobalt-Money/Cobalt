import { disconnectBankConnection } from "@cobalt-web/server-data/accounts/mutations";
import {
  getBankAccountById,
  getBankAccounts,
} from "@cobalt-web/server-data/accounts/queries";
import {
  accountIdParamSchema,
  bankAccountDetailResponseSchema,
  bankAccountListResponseSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/accounts/schemas";
import { removeItem } from "@cobalt-web/server-data/providers/plaid/link/actions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": { schema: bankAccountListResponseSchema },
      },
      description: "List of bank accounts",
    },
  },
  summary: "List bank accounts",
  tags: ["Accounts"],
});

const detail = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/bank/{id}",
  request: { params: accountIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: bankAccountDetailResponseSchema },
      },
      description: "Bank account details",
    },
    404: { description: "Account not found" },
  },
  summary: "Get bank account details",
  tags: ["Accounts"],
});

const disconnect = createRoute({
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/bank/{id}",
  request: { params: accountIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Account disconnected",
    },
  },
  summary: "Disconnect bank account",
  tags: ["Accounts"],
});

const bankAccountsRouter = new OpenAPIHono<AppEnv>()
  .openapi(list, async (c) => {
    const accounts = await getBankAccounts(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ accounts }, 200);
  })
  .openapi(detail, async (c) => {
    const { id } = c.req.valid("param");
    const account = await getBankAccountById(c.var.user.id, id);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    c.header("Cache-Control", "private, max-age=60");
    return c.json(account, 200);
  })
  .openapi(disconnect, async (c) => {
    const { id } = c.req.valid("param");
    const result = await disconnectBankConnection(c.var.user.id, id);
    if (result.success && result.accessToken) {
      try {
        await removeItem(result.accessToken);
      } catch (error) {
        console.warn("[disconnectBank] Plaid itemRemove failed", error);
      }
    }
    return c.json({ message: result.message, success: result.success }, 200);
  });

export { bankAccountsRouter };
