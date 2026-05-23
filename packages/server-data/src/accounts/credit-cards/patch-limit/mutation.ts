import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { eq } from "drizzle-orm";

import { getOwnedPlaidAccountInternalId } from "../_shared.js";

/** Set the user-override credit limit on the balance row for a Plaid account. */
export async function patchCreditLimit(
  plaidAccountId: string,
  userId: string,
  creditLimit: number,
) {
  const internalId = await getOwnedPlaidAccountInternalId(plaidAccountId, userId);
  await db
    .update(balance)
    .set({ userOverrideCreditLimit: String(creditLimit) })
    .where(eq(balance.accountId, internalId));
}
