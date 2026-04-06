import { plaidClient } from "@cobalt-web/clients/plaid";
import { db } from "@cobalt-web/db";
import { bankAccount } from "@cobalt-web/db/schema/banking";
import type { AccountBase, LiabilitiesGetResponse } from "plaid";

export interface PlaidLiabilitiesFetchResult {
  accounts: AccountBase[];
  liabilities: LiabilitiesGetResponse["liabilities"];
}

/**
 * Calls Plaid `/liabilities/get` for the given access token.
 */
export async function fetchLiabilitiesFromPlaid(
  accessToken: string
): Promise<PlaidLiabilitiesFetchResult> {
  const response = await plaidClient.liabilitiesGet({
    access_token: accessToken,
  });

  const { liabilities, accounts } = response.data;
  return { accounts, liabilities };
}

/**
 * Credit / mortgage / student counts from a liabilities payload.
 */
export function countLiabilitiesCategories(
  liabilities: LiabilitiesGetResponse["liabilities"]
): {
  creditCount: number;
  mortgageCount: number;
  studentCount: number;
} {
  return {
    creditCount: liabilities.credit?.length ?? 0,
    mortgageCount: liabilities.mortgage?.length ?? 0,
    studentCount: liabilities.student?.length ?? 0,
  };
}

/**
 * Upserts bank accounts returned alongside liabilities (may not exist yet from Transactions).
 */
export async function upsertBankAccountsFromPlaidLiabilitiesAccounts(
  itemId: string,
  accounts: AccountBase[]
): Promise<{ newAccountsCount: number }> {
  let newAccountsCount = 0;

  for (const account of accounts) {
    const result = await db
      .insert(bankAccount)
      .values({
        mask: account.mask || null,
        name: account.name || account.official_name || "Account",
        officialName: account.official_name || null,
        plaidAccountId: account.account_id,
        plaidItemId: itemId,
        subtype: account.subtype || null,
        type: account.type,
      })
      .onConflictDoNothing();

    if ((result.rowCount ?? 0) > 0) {
      newAccountsCount += 1;
    }
  }

  return { newAccountsCount };
}
