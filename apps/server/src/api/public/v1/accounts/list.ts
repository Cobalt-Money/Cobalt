import { getAccounts } from "@cobalt-web/server-data/accounts/list";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { accountSchema } from "../schemas.js";

const responseSchema = z.object({ data: z.array(accountSchema) }).openapi("AccountList");

const route = createRoute({
  description:
    "Returns every account the API key's owner has connected — checking, savings, credit, brokerage, and manual.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "accounts_list",
  path: "/accounts",
  responses: {
    200: jsonContent(responseSchema, "Accounts owned by the authenticated user"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List accounts",
  tags: ["Accounts"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const rows = await getAccounts(user.id);
  return c.json(responseSchema.parse({ data: rows }), 200);
});
