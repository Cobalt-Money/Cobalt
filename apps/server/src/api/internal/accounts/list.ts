import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { bankAccountsResponseSchema, getBankAccounts } from "@cobalt-web/server-data/accounts/list";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "List the user's Plaid-connected bank accounts (excludes credit + investment).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  responses: {
    200: jsonContent(bankAccountsResponseSchema, "List of bank accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List bank accounts",
  tags: ["Accounts"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const accounts = await getBankAccounts(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(bankAccountsResponseSchema.parse({ accounts }), 200);
});
