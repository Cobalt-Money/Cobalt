import { captureWorkflowExceptionStep, toSerializableError } from "../shared/steps";
import { applyAppStoreNotificationStep } from "./steps";
import type { AppStoreWebhookParams, AppStoreWebhookResult } from "./steps";

export async function appstoreWebhookWorkflow(
  params: AppStoreWebhookParams,
): Promise<AppStoreWebhookResult> {
  "use workflow";

  const { notificationType, originalTransactionId } = params;

  try {
    const result = await applyAppStoreNotificationStep(params);

    return {
      notificationType,
      originalTransactionId,
      result,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await captureWorkflowExceptionStep("appstore_webhook", toSerializableError(error), {
      notificationType,
      originalTransactionId,
    });

    return {
      error: errorMessage,
      notificationType,
      originalTransactionId,
      success: false,
    };
  }
}
