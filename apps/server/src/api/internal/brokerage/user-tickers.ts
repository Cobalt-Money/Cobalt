import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getUserTickers,
  userTickersResponseSchema,
} from "@cobalt-web/server-data/brokerage/user-tickers";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/user-tickers",
  responses: {
    200: jsonContent(userTickersResponseSchema, "List of held stock tickers"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Get user tickers",
  tags: ["Brokerage"],
});

export const userTickersRouter = createApp().openapi(route, async (c) => {
  const tickers = await getUserTickers(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(userTickersResponseSchema.parse({ tickers }), 200);
});
