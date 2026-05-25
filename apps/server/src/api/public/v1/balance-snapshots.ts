import { getBalanceSnapshotsByUserId } from "@cobalt-web/server-data/snapshots/queries";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { balanceSnapshotSchema } from "./schemas.js";

const listQuerySchema = z.object({
  accountId: z.string().optional().openapi({ description: "Filter to a single account." }),
  endDate: z.string().optional().openapi({ example: "2026-05-22" }),
  startDate: z.string().optional().openapi({ example: "2026-01-01" }),
});

const balanceSnapshotsResponseSchema = z
  .object({ data: z.array(balanceSnapshotSchema) })
  .openapi("BalanceSnapshotList");

const route = createRoute({
  description:
    "End-of-day balance history for non-brokerage accounts (checking, savings, credit). Use `/v1/portfolio/snapshots` for brokerage value series.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "balances_snapshots",
  path: "/balances/snapshots",
  request: { query: listQuerySchema },
  responses: {
    200: jsonContent(balanceSnapshotsResponseSchema, "Balance snapshots"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List balance snapshots",
  tags: ["Balances"],
});

export const balanceSnapshotsRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const q = c.req.valid("query");
  // Internal filter `accountId` is the provider's external id; we expose the
  // internal id on `/v1`. Drop into the unfiltered query and post-filter so
  // the public surface stays internal-id-only.
  const rows = await getBalanceSnapshotsByUserId(user.id, {
    endDate: q.endDate,
    startDate: q.startDate,
  });
  const filtered = q.accountId ? rows.filter((r) => r.accountId === q.accountId) : rows;
  return c.json(
    balanceSnapshotsResponseSchema.parse({
      data: filtered.map((r) => ({
        accountId: r.accountId,
        availableBalance: r.availableBalance,
        creditLimit: r.creditLimit,
        currentBalance: r.currentBalance,
        date: r.snapshotDate,
        id: r.id,
      })),
    }),
    200,
  );
});
