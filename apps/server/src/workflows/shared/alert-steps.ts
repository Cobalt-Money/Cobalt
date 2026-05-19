import type { AlertSource, AlertType } from "@cobalt-web/db/schema/users/alerts";
import { insertAlert, resolveAlerts } from "@cobalt-web/server-data/alerts/mutations";

export async function insertAlertStep(params: {
  metadata?: { institutionLogo?: string | null };
  source: AlertSource;
  sourceId: string;
  type: AlertType;
  userId: string;
}): Promise<{ inserted: boolean }> {
  "use step";

  return await insertAlert(params);
}

export async function resolveAlertsStep(params: {
  source: AlertSource;
  sourceId: string;
}): Promise<{ resolvedCount: number }> {
  "use step";

  return await resolveAlerts(params);
}
