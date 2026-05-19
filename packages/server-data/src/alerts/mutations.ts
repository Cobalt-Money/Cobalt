import { db } from "@cobalt-web/db";
import { userAlerts } from "@cobalt-web/db/schema/users/alerts";
import type { AlertSource, AlertType } from "@cobalt-web/db/schema/users/alerts";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Inserts a user alert. `(userId, type, source, sourceId)` is uniquely
 * indexed — duplicate inserts are silently no-ops via `onConflictDoNothing`.
 */
export async function insertAlert(params: {
  metadata?: { institutionLogo?: string | null };
  source: AlertSource;
  sourceId: string;
  type: AlertType;
  userId: string;
}): Promise<{ inserted: boolean }> {
  const result = await db
    .insert(userAlerts)
    .values({
      metadata: params.metadata ?? null,
      source: params.source,
      sourceId: params.sourceId,
      type: params.type,
      userId: params.userId,
    })
    .onConflictDoNothing();
  return { inserted: (result.rowCount ?? 0) > 0 };
}

/**
 * Resolves all active alerts matching `(source, sourceId)`. Called when the
 * underlying connection is repaired so the UI stops showing the warning.
 */
export async function resolveAlerts(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  const result = await db
    .update(userAlerts)
    .set({ resolvedAt: new Date() })
    .where(
      and(
        eq(userAlerts.source, params.source),
        eq(userAlerts.sourceId, params.sourceId),
        isNull(userAlerts.resolvedAt),
      ),
    );
  return { resolvedCount: result.rowCount ?? 0 };
}
