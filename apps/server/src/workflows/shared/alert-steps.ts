import { db } from "@cobalt-web/db";
import { userAlerts } from "@cobalt-web/db/schema/users/alerts";
import type { AlertSource, AlertType } from "@cobalt-web/db/schema/users/alerts";
import { and, eq, isNull } from "drizzle-orm";

export async function insertAlertStep(params: {
  userId: string;
  type: AlertType;
  source: AlertSource;
  sourceId: string;
  metadata?: { institutionLogo?: string | null };
}): Promise<{ inserted: boolean }> {
  "use step";

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

export async function resolveAlertsStep(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  "use step";

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
