import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/errors.js";

/**
 * Resolve the internal `financial_account.id` for a (user, Plaid externalId)
 * pair. Throws a neutral 404 if the row is missing OR not owned — never
 * distinguishes the two (anti-enumeration).
 */
export async function getOwnedPlaidAccountInternalId(
  plaidAccountId: string,
  userId: string,
): Promise<string> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      externalId: { eq: plaidAccountId },
      source: { eq: "plaid" },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  return row.id;
}
