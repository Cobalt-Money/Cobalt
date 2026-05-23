import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/errors.js";
import { getBankAccountsJoined } from "../_shared/bank-account-query.js";
import { numOrNull } from "../_shared/lib.js";
import type { BankAccountResponse } from "../_shared/schema.js";
import type { AccountListItem } from "../list/schema.js";

/**
 * Single bank account (Plaid-linked) by external `plaidAccountId`.
 * Ownership folded into WHERE — no fetch-all-then-find.
 */
export async function getBankAccountDetail(
  userId: string,
  plaidAccountId: string,
): Promise<BankAccountResponse> {
  const rows = await getBankAccountsJoined(userId, { externalId: plaidAccountId });
  const [found] = rows;
  if (!found) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  return found;
}

/**
 * Single-account variant of `getAccounts` keyed on the internal
 * `financial_account.id`. Works for any source (Plaid, SnapTrade, manual).
 * Throws a neutral 404 on missing/unowned (ownership folded into WHERE).
 */
export async function getAccountDetail(userId: string, id: string): Promise<AccountListItem> {
  const r = await db.query.financialAccount.findFirst({
    columns: {
      customName: true,
      id: true,
      institutionName: true,
      mask: true,
      name: true,
      subtype: true,
      type: true,
    },
    where: { id: { eq: id }, userId: { eq: userId } },
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
  if (!r) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  return {
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
  };
}
