import { db } from "@cobalt-web/db";

import { getBankAccountsJoined, toBankAccountListItem } from "../_shared/bank-account-query.js";
import { numOrNull } from "../_shared/lib.js";
import type { BankAccountListItem } from "../_shared/schema.js";
import type { AccountListItem, GetAccounts } from "./schema.js";

/** Plaid-connected bank accounts excluding credit + investment. */
export async function getBankAccounts(userId: string): Promise<BankAccountListItem[]> {
  const all = await getBankAccountsJoined(userId);
  return all
    .filter((a) => a.type !== "credit" && a.type !== "investment")
    .map(toBankAccountListItem);
}

/**
 * Flat list of all accounts (any source: Plaid, SnapTrade, manual). Exposes
 * the internal `financial_account.id` so the SDK / finance agent can use it
 * as `accountId` for `transactions.create` on a manual account.
 */
export async function getAccounts(
  userId: string,
  params: GetAccounts = {},
): Promise<AccountListItem[]> {
  const rows = await db.query.financialAccount.findMany({
    columns: {
      customName: true,
      id: true,
      institutionName: true,
      mask: true,
      name: true,
      subtype: true,
      type: true,
    },
    where: { userId: { eq: userId } },
    with: {
      balance: {
        columns: {
          creditLimit: true,
          currency: true,
          current: true,
          userOverrideCreditLimit: true,
        },
      },
      plaidConnection: {
        columns: { institutionName: true },
      },
    },
  });

  return rows
    .filter((r) => {
      if (params.type && r.type !== params.type) {
        return false;
      }
      if (params.subtype && r.subtype !== params.subtype) {
        return false;
      }
      return true;
    })
    .map((r) => ({
      creditLimit:
        numOrNull(r.balance?.userOverrideCreditLimit ?? null) ??
        numOrNull(r.balance?.creditLimit ?? null),
      currency: r.balance?.currency ?? null,
      current: numOrNull(r.balance?.current ?? null),
      id: r.id,
      institutionName: r.plaidConnection?.institutionName ?? r.institutionName ?? null,
      mask: r.mask,
      name: r.customName ?? r.name,
      subtype: r.subtype,
      type: r.type,
    }));
}
