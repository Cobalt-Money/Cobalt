import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  patchCreditLimit,
  patchCreditLimitSchema,
} from "@cobalt-web/server-data/accounts/credit-cards/patch-limit";
import {
  bankAccountResponseSchema,
  getBankAccountDetail,
} from "@cobalt-web/server-data/accounts/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Set a user-override credit limit on a Plaid-linked credit card.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/credit-cards/{id}/credit-limit",
  request: {
    body: {
      content: { "application/json": { schema: patchCreditLimitSchema } },
    },
    params: accountIdSchema,
  },
  responses: {
    200: jsonContent(bankAccountResponseSchema, "Updated credit card"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(patchCreditLimitSchema),
  },
  summary: "Set credit limit override",
  tags: ["Accounts"],
});

export const creditCardsPatchLimitRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const { creditLimit } = c.req.valid("json");
  await patchCreditLimit(id, c.var.user.id, creditLimit);
  const updated = await getBankAccountDetail(c.var.user.id, id);
  return c.json(bankAccountResponseSchema.parse(updated), 200);
});
