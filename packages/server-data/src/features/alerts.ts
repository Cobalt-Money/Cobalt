import { db } from "@cobalt-web/db";
import { userAlerts, ALERT_STATUSES } from "@cobalt-web/db/schema/features";
import type { AlertType, AlertSource } from "@cobalt-web/db/schema/features";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Inserts a user alert if one doesn't already exist for the same
 * source + source_id + type combination (idempotency via unique index).
 *
 * @returns Object with `inserted` boolean indicating if a new row was created
 */
export async function insertAlert(params: {
  userId: string;
  type: AlertType;
  source: AlertSource;
  sourceId: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ inserted: boolean }> {
  const result = await db
    .insert(userAlerts)
    .values({
      message: params.message ?? null,
      metadata: params.metadata ?? null,
      source: params.source,
      sourceId: params.sourceId,
      title: params.title,
      type: params.type,
      userId: params.userId,
    })
    .onConflictDoNothing();

  return { inserted: (result.rowCount ?? 0) > 0 };
}

/**
 * Resolves all active (unread or read) alerts for a given source + sourceId.
 * Used when connections are repaired or issues are resolved.
 *
 * @returns Object with `resolvedCount` indicating how many alerts were updated
 */
export async function resolveAlerts(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  const result = await db
    .update(userAlerts)
    .set({
      resolvedAt: new Date(),
      status: ALERT_STATUSES.RESOLVED,
    })
    .where(
      and(
        eq(userAlerts.source, params.source),
        eq(userAlerts.sourceId, params.sourceId),
        inArray(userAlerts.status, [ALERT_STATUSES.UNREAD, ALERT_STATUSES.READ])
      )
    );

  return { resolvedCount: result.rowCount ?? 0 };
}
