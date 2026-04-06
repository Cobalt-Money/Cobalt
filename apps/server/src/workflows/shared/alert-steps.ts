import type { AlertType, AlertSource } from "@cobalt-web/db/schema/features";
import {
  insertAlert,
  resolveAlerts,
} from "@cobalt-web/server-data/features/alerts";

/**
 * Step: Insert an alert for a user.
 * Delegates to server-data mutation with idempotency via unique index.
 */
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

  return await insertAlert(params);
}

/**
 * Step: Resolve all active alerts for a given source + sourceId.
 * Delegates to server-data mutation.
 */
export async function resolveAlertsStep(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  "use step";

  return await resolveAlerts(params);
}
