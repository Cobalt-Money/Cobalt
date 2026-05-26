import { getPositions } from "@cobalt-web/server-data/brokerage/positions";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { positionSchema } from "./schemas.js";

const listQuerySchema = z.object({
  accountId: z
    .string()
    .optional()
    .openapi({ description: "Filter to a single brokerage account." }),
});

const positionsResponseSchema = z.array(positionSchema).openapi("PositionList");

const route = createRoute({
  description:
    "List brokerage positions (stock, ETF, crypto holdings) across the user's investment accounts.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "positions_list",
  path: "/positions",
  request: { query: listQuerySchema },
  responses: {
    200: jsonContent(positionsResponseSchema, "Positions"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List positions",
  tags: ["Positions"],
});

export const positionsRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const q = c.req.valid("query");
  const result = await getPositions(user.id, {
    accountId: q.accountId,
  });
  return c.json(positionsResponseSchema.parse(result.positions), 200);
});
