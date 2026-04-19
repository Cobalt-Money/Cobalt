import { applyAppStoreNotification } from "@cobalt-web/server-data/subscriptions";
import type {
  AppStoreNotificationInput,
  AppStoreNotificationResult,
} from "@cobalt-web/server-data/subscriptions";

export type AppStoreWebhookParams = AppStoreNotificationInput;

export interface AppStoreWebhookResult {
  success: boolean;
  notificationType: AppStoreNotificationInput["notificationType"];
  originalTransactionId: string;
  result?: AppStoreNotificationResult;
  error?: string;
}

export async function applyAppStoreNotificationStep(
  params: AppStoreNotificationInput
): Promise<AppStoreNotificationResult> {
  "use step";

  return await applyAppStoreNotification(params);
}
