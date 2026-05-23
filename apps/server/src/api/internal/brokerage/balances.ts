import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { balancesResponseSchema, getBalances } from "@cobalt-web/server-data/brokerage/balances";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/balances",
  responses: {
    200: jsonContent(balancesResponseSchema, "Account balances"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Get brokerage balances",
  tags: ["Brokerage"],
});

export const balancesRouter = createApp().openapi(route, async (c) => {
  const result = await getBalances(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(balancesResponseSchema.parse(result), 200);
});
