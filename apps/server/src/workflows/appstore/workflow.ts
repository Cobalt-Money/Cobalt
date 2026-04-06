import type { AppStoreWebhookParams } from "./steps";
import { forwardToSuperwallStep, updateSubscriptionStep } from "./steps";

export interface AppStoreWebhookResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Main workflow for processing App Store Server Notifications V2
 *
 * Orchestrates:
 * 1. Forwarding to Superwall (continues even if this fails)
 * 2. Updating subscription status in database
 *
 * This workflow is triggered by the webhook route after minimal validation.
 * Apple expects fast responses, so the route returns immediately after
 * triggering this workflow.
 */
export async function appStoreWebhookWorkflow(
  params: AppStoreWebhookParams
): Promise<AppStoreWebhookResult> {
  "use workflow";

  try {
    try {
      await forwardToSuperwallStep(params.rawBody);
    } catch {
      // Log but don't fail the workflow
    }

    if (params.transactionInfo) {
      await updateSubscriptionStep({
        notificationType: params.notificationType,
        transactionInfo: params.transactionInfo,
      });
    }

    return {
      message: `Processed ${params.notificationType} notification`,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      message: `Failed to process ${params.notificationType} notification`,
      success: false,
    };
  }
}
