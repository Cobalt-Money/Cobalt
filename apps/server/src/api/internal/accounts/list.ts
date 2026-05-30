import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  bankAccountsQuerySchema,
  bankAccountsResponseSchema,
  getBankAccounts,
} from "@cobalt-web/server-data/accounts/list";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "List the user's bank-shape accounts (depository, credit, loan) across Plaid + manual sources. Use `?type=` to narrow.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: { query: bankAccountsQuerySchema },
  responses: {
    200: jsonContent(bankAccountsResponseSchema, "List of bank accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(bankAccountsQuerySchema),
  },
  summary: "List bank accounts",
  tags: ["Accounts"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const query = c.req.valid("query");
  const accounts = await getBankAccounts(c.var.user.id, query);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(bankAccountsResponseSchema.parse({ accounts }), 200);
});
