import { db } from "@cobalt-web/db";
import {
  ALERT_STATUSES,
  userAlerts,
} from "@cobalt-web/db/schema/features/user-alerts";
import type {
  AlertSource,
  AlertType,
} from "@cobalt-web/db/schema/features/user-alerts";
import { and, eq, inArray } from "drizzle-orm";

export async function insertAlertStep(params: {
  userId: string;
  type: AlertType;
  source: AlertSource;
  sourceId: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ inserted: boolean }> {
  "use step";

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

export async function resolveAlertsStep(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  "use step";

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
