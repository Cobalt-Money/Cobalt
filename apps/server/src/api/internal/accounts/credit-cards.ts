import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  clearCreditLimitOverride,
  setCreditLimitOverride,
} from "@cobalt-web/server-data/accounts/mutations";
import { getCreditCards } from "@cobalt-web/server-data/accounts/queries";
import {
  accountIdParamSchema,
  creditCardListResponseSchema,
  creditLimitBodySchema,
  successResponseSchema,
} from "@cobalt-web/server-data/accounts/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/credit-cards",
  responses: {
    200: jsonContent(creditCardListResponseSchema, "List of credit cards"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
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
    200: jsonContent(successResponseSchema, "Credit limit updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(creditLimitBodySchema),
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
    200: jsonContent(successResponseSchema, "Credit limit reset"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(accountIdParamSchema),
  },
  summary: "Reset credit limit override",
  tags: ["Accounts"],
});

const creditCardsRouter = createApp()
  .openapi(list, async (c) => {
    const accounts = await getCreditCards(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ accounts }, 200);
  })
  .openapi(patchLimit, async (c) => {
    const { id } = c.req.valid("param");
    const { creditLimit } = c.req.valid("json");
    await setCreditLimitOverride(id, c.var.user.id, creditLimit);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteLimit, async (c) => {
    const { id } = c.req.valid("param");
    await clearCreditLimitOverride(id, c.var.user.id);
    return c.json({ success: true }, 200);
  });

export { creditCardsRouter };
