import {
  clearCreditLimitOverride,
  getAccountOwner,
  setCreditLimitOverride,
} from "@cobalt-web/server-data/accounts/mutations";
import { getCreditCards } from "@cobalt-web/server-data/accounts/queries";
import {
  accountIdParamSchema,
  creditCardListResponseSchema,
  creditLimitBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/accounts/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/credit-cards",
  responses: {
    200: {
      content: {
        "application/json": { schema: creditCardListResponseSchema },
      },
      description: "List of credit cards",
    },
  },
  summary: "List credit cards",
  tags: ["Accounts"],
});

const patchLimit = createRoute({
  method: "patch",
  middleware: [requireAuth] as const,
  path: "/credit-cards/{id}/credit-limit",
  request: {
    body: {
      content: { "application/json": { schema: creditLimitBodySchema } },
    },
    params: accountIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Credit limit updated",
    },
    403: { description: "Unauthorized" },
    404: { description: "Account not found" },
  },
  summary: "Set credit limit override",
  tags: ["Accounts"],
});

const deleteLimit = createRoute({
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/credit-cards/{id}/credit-limit",
  request: { params: accountIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponseSchema } },
      description: "Credit limit reset",
    },
    403: { description: "Unauthorized" },
    404: { description: "Account not found" },
  },
  summary: "Reset credit limit override",
  tags: ["Accounts"],
});

const creditCardsRouter = new OpenAPIHono<AppEnv>()
  .openapi(list, async (c) => {
    const accounts = await getCreditCards(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ accounts }, 200);
  })
  .openapi(patchLimit, async (c) => {
    const { id } = c.req.valid("param");
    const { creditLimit } = c.req.valid("json");

    const account = await getAccountOwner(id);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    if (account.userId !== c.var.user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await setCreditLimitOverride(id, creditLimit);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteLimit, async (c) => {
    const { id } = c.req.valid("param");

    const account = await getAccountOwner(id);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    if (account.userId !== c.var.user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await clearCreditLimitOverride(id);
    return c.json({ success: true }, 200);
  });

export { creditCardsRouter };
