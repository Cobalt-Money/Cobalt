import { db } from "@cobalt-web/db";

import type { AlertDTO } from "./schemas.js";

/**
 * Active alerts (unread + read) for a user, newest first.
 * Dismissed/resolved rows are excluded — same set the web sheet shows.
 */
export async function getActiveAlerts(userId: string): Promise<AlertDTO[]> {
  const rows = await db.query.userAlerts.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      status: { in: ["unread", "read"] },
      userId: { eq: userId },
    },
  });

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  }));
}
