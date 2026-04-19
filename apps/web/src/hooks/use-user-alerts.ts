import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

export interface UserAlertRow {
  id: string;
  userId: string;
  type: string;
  source: string;
  sourceId: string | null;
  title: string;
  message: string | null;
  status: string;
  metadata: unknown;
  createdAt: number;
  resolvedAt: number | null;
}

/**
 * Live-synced list of active (unread + read) alerts for the current user.
 * Dismiss/resolve both drop rows from this view.
 */
export function useUserAlerts() {
  const [alerts, result] = useQuery(queries.alerts.active());
  return {
    alerts: alerts as readonly UserAlertRow[],
    isComplete: result.type === "complete",
  };
}
