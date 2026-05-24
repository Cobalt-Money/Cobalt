import type { PortfolioSnapshotItem } from "@cobalt-web/server-data/brokerage/portfolio-snapshots/schema";
import { getPortfolioSnapshots } from "@cobalt-web/server-data/brokerage/portfolio-snapshots";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { portfolioSnapshotSchema } from "./schemas.js";

const listQuerySchema = z.object({
  accountId: z
    .string()
    .optional()
    .openapi({ description: "Filter to a single brokerage account." }),
  endDate: z.string().optional().openapi({ example: "2026-05-22" }),
  startDate: z.string().optional().openapi({ example: "2026-01-01" }),
});

const portfolioSnapshotsResponseSchema = z
  .object({ data: z.array(portfolioSnapshotSchema) })
  .openapi("PortfolioSnapshotList");

const route = createRoute({
  description:
    "End-of-day portfolio value snapshots. Defaults to the trailing 6 months when no dates are supplied.",
  method: "get",
  middleware: [requireApiKey] as const,
  path: "/portfolio/snapshots",
  request: { query: listQuerySchema },
  responses: {
    200: jsonContent(portfolioSnapshotsResponseSchema, "Snapshots"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List portfolio snapshots",
  tags: ["Portfolio"],
});

export const portfolioSnapshotsRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const q = c.req.valid("query");
  const snapshots = await getPortfolioSnapshots(user.id, {
    accountId: q.accountId,
    endDate: q.endDate,
    startDate: q.startDate,
  });
  return c.json(
    portfolioSnapshotsResponseSchema.parse({
      data: snapshots.map((s: PortfolioSnapshotItem) => ({
        accountId: s.accountId,
        date: s.snapshotDate,
        id: s.id,
        value: s.value,
      })),
    }),
    200,
  );
});
