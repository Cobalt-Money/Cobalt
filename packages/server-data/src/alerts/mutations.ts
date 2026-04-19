import { db } from "@cobalt-web/db";
import {
  ALERT_STATUSES,
  userAlerts,
} from "@cobalt-web/db/schema/features/user-alerts";
import { and, eq } from "drizzle-orm";

/**
 * Dismiss a user alert owned by the given user. Returns `success: false`
 * when the row doesn't exist or belongs to someone else — caller decides
 * whether to surface that as 404.
 */
export async function dismissAlert(userId: string, alertId: string) {
  const result = await db
    .update(userAlerts)
    .set({ status: ALERT_STATUSES.DISMISSED })
    .where(and(eq(userAlerts.id, alertId), eq(userAlerts.userId, userId)));

  if ((result.rowCount ?? 0) === 0) {
    return { message: "Alert not found", success: false };
  }
  return { success: true };
}
