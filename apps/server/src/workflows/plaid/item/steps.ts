import { db } from "@cobalt-web/db";
import { bankConnection } from "@cobalt-web/db/schema/banking";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";

/**
 * Step: Get Plaid item from database
 */
export async function getPlaidItemStep(itemId: string) {
  "use step";

  const [item] = await db
    .select()
    .from(bankConnection)
    .where(eq(bankConnection.plaidItemId, itemId))
    .limit(1);

  if (!item) {
    throw new Error(`Plaid item not found: ${itemId}`);
  }

  return item;
}

/**
 * Step: Update Plaid item state for ITEM webhooks.
 * Handles NEW_ACCOUNTS_AVAILABLE, ERROR, PENDING_DISCONNECT, LOGIN_REPAIRED.
 */
export async function updateItemStateStep(params: {
  webhook_code: string;
  item_id: string | null;
  error?: unknown;
}) {
  "use step";

  const { webhook_code, item_id } = params;

  if (!item_id) {
    throw new FatalError(`ITEM webhook missing item_id: ${webhook_code}`);
  }

  switch (webhook_code) {
    case "NEW_ACCOUNTS_AVAILABLE": {
      await db
        .update(bankConnection)
        .set({ newAccountsAvailable: true, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "ERROR": {
      const errorPayload = params.error ?? null;
      await db
        .update(bankConnection)
        .set({ error: errorPayload, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "PENDING_DISCONNECT": {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(bankConnection)
        .set({
          pendingDisconnectAt: sevenDaysFromNow,
          updatedAt: new Date(),
        })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    case "LOGIN_REPAIRED": {
      await db
        .update(bankConnection)
        .set({
          error: null,
          pendingDisconnectAt: null,
          updatedAt: new Date(),
        })
        .where(eq(bankConnection.plaidItemId, item_id));
      break;
    }

    default: {
      return { skipped: true, webhook_code };
    }
  }

  return { success: true, webhook_code };
}
