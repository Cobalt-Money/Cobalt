import { ApiError } from "../_shared/errors.js";
import { getBankAccountsJoined } from "../_shared/bank-account-query.js";
import type { BankAccountResponse } from "../_shared/schema.js";

/**
 * Single account by internal `financial_account.id`. Source-agnostic — works
 * for Plaid, manual, and snaptrade rows. Plaid-only fields (reauth error,
 * billed products, plaid item id) are null for non-Plaid sources.
 */
export async function getAccountDetail(userId: string, id: string): Promise<BankAccountResponse> {
  const rows = await getBankAccountsJoined(userId, { id });
  const [found] = rows;
  if (!found) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  return found;
}
