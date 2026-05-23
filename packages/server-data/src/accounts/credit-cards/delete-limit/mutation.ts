import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { eq } from "drizzle-orm";

import { getOwnedPlaidAccountInternalId } from "../_shared.js";

/** Clear the user-override credit limit (revert to Plaid's value). */
export async function deleteCreditLimit(plaidAccountId: string, userId: string) {
  const internalId = await getOwnedPlaidAccountInternalId(plaidAccountId, userId);
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: null })
    .where(eq(balance.accountId, internalId));
}
