import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/api-error.js";

export { ApiError } from "../_shared/api-error.js";

/**
 * 404 if `externalId` doesn't match a brokerage-shaped account
 * (SnapTrade or Plaid investment) owned by `userId`.
 *
 * Brokerage routes accept the public `externalId` (text) — not the internal
 * UUID — so this helper differs from `assertAccountOwned` in the
 * transactions module.
 */
export async function assertBrokerageAccountOwnedByExternalId(
  externalId: string,
  userId: string,
): Promise<void> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      OR: [
        { source: { eq: "snaptrade" } },
        { source: { eq: "plaid" }, type: { eq: "investment" } },
      ],
      externalId: { eq: externalId },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "brokerage_account_not_found", "Brokerage account not found");
  }
}

/**
 * 404 if `accountId` (internal UUID) is not a brokerage-shaped account
 * owned by `userId`. Used by portfolio-snapshots which keys on UUID.
 */
export async function assertBrokerageAccountOwnedById(
  accountId: string,
  userId: string,
): Promise<void> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true },
    where: {
      OR: [
        { source: { eq: "snaptrade" } },
        { source: { eq: "plaid" }, type: { eq: "investment" } },
      ],
      id: { eq: accountId },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "brokerage_account_not_found", "Brokerage account not found");
  }
}
