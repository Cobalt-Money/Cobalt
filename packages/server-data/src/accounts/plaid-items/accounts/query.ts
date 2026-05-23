import { db } from "@cobalt-web/db";

import { ApiError } from "../../_shared/errors.js";
import type { PlaidAccountForItemResponse } from "./schema.js";

/**
 * Single-roundtrip fetch of the plaid_connection (for ownership) plus its
 * accounts. 404s with a neutral error if the item is missing or unowned.
 */
export async function getAccountsForPlaidItem(
  userId: string,
  plaidItemId: string,
): Promise<PlaidAccountForItemResponse[]> {
  const item = await db.query.plaidConnection.findFirst({
    columns: { plaidItemId: true },
    where: {
      plaidItemId: { eq: plaidItemId },
      userId: { eq: userId },
    },
    with: {
      accounts: {
        columns: {
          createdAt: true,
          externalId: true,
          id: true,
          mask: true,
          name: true,
          officialName: true,
          subtype: true,
          type: true,
          updatedAt: true,
        },
        where: { source: { eq: "plaid" } },
      },
    },
  });
  if (!item) {
    throw new ApiError(404, "plaid_item_not_found", "Plaid item not found");
  }
  return item.accounts.map((a) => ({
    createdAt: a.createdAt.toISOString(),
    id: a.id,
    mask: a.mask,
    name: a.name,
    officialName: a.officialName,
    plaidAccountId: a.externalId,
    plaidItemId: item.plaidItemId,
    subtype: a.subtype,
    type: a.type,
    updatedAt: a.updatedAt.toISOString(),
  }));
}
