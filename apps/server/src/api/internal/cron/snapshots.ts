import { db } from "@cobalt-web/db";
import { OpenAPIHono } from "@hono/zod-openapi";
import { start } from "workflow/api";

import { snapshotUserWorkflow } from "@/workflows/snapshots/workflow";

export const snapshotsCronRouter = new OpenAPIHono();

snapshotsCronRouter.get("/snapshots", async (c) => {
  // Get distinct user IDs with active brokerage or bank connections
  const users = await db.query.brokerageAccounts.findMany({
    columns: { userId: true },
  });

  const bankUsers = await db.query.bankConnection.findMany({
    columns: { userId: true },
  });

  const uniqueUserIds = [
    ...new Set([
      ...users.map((u) => u.userId),
      ...bankUsers.map((u) => u.userId),
    ]),
  ];

  for (const userId of uniqueUserIds) {
    start(snapshotUserWorkflow, [userId]);
  }

  return c.json({
    success: true,
    usersDispatched: uniqueUserIds.length,
  });
});
