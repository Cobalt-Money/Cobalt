import { getBalancesByUserId } from "@cobalt-web/server-data/brokerage/queries";
import { balancesResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
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
  },
  summary: "Get brokerage balances",
  tags: ["Brokerage"],
});

export const balancesRouter = createApp().openapi(route, async (c) => {
  const result = await getBalancesByUserId(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(result, 200);
});
