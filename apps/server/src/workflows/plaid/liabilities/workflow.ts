import { getPlaidItemStep } from "../sync/steps";
import { syncLiabilities } from "./orchestration";

export interface PlaidLiabilitiesSyncResult {
  success: boolean;
  itemId: string;
  error?: string;
}

/** Webhook or post-link — same sync; safe to run repeatedly (DB upserts). */
export async function plaidLiabilitiesSyncWorkflow(
  itemId: string,
): Promise<PlaidLiabilitiesSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);
    await syncLiabilities(item.plaidAccessToken, item.plaidItemId);
    return { itemId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return { error: errorMessage, itemId, success: false };
  }
}
